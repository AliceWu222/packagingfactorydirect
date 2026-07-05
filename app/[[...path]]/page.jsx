import fs from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 3600;

const ROOT = /*turbopackIgnore: true*/ process.cwd();
const SITE_URL = 'https://packagingfactorydirect.com';
const ISR_SECONDS = Number(process.env.PFD_ISR_SECONDS || process.env.PRODUCT_PAGE_REVALIDATE_SECONDS || 3600);

const REMOTE_DETAIL_PREFIXES = ['products/', 'blog/', 'news/'];
const REMOTE_LISTING_PAGES = new Set(['products.html', 'blog.html', 'news.html']);

function contentBaseUrl() {
  return (
    process.env.PFD_CONTENT_BASE_URL ||
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.CMS_CONTENT_BASE_URL ||
    ''
  ).trim();
}
function remoteFirstEnabled() {
  return String(process.env.PFD_REMOTE_CONTENT_FIRST || '').toLowerCase() === 'true';
}
function remoteListsEnabled() {
  return String(process.env.PFD_ENABLE_REMOTE_LISTS || 'true').toLowerCase() !== 'false';
}
function normalizeBase(base) {
  if (!base) return '';
  return base.endsWith('/') ? base : `${base}/`;
}
function remoteUrlForRel(rel) {
  const base = normalizeBase(contentBaseUrl());
  if (!base) return null;
  return new URL(rel.replace(/^\/+/, ''), base).toString();
}
function isRemoteEligible(rel) {
  return REMOTE_LISTING_PAGES.has(rel) || REMOTE_DETAIL_PREFIXES.some(prefix => rel.startsWith(prefix));
}
function manifestUrlFor(kind) {
  const upper = kind.toUpperCase();
  const specific = process.env[`PFD_${upper}_INDEX_URL`] || process.env[`PFD_${upper}_MANIFEST_URL`];
  if (specific) return specific;
  const base = normalizeBase(contentBaseUrl());
  if (!base) return null;
  return new URL(`data/${kind}.remote.json`, base).toString();
}
function safeResolve(relPath) {
  const resolved = path.resolve(/*turbopackIgnore: true*/ ROOT, relPath);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}
async function getParamObject(params) {
  return params && typeof params.then === 'function' ? await params : params;
}
function requestToHtmlPath(parts) {
  const joined = (parts || []).join('/');
  if (!joined || joined === 'index' || joined === 'index.html') return 'index.html';
  if (joined.endsWith('.html')) return joined;
  if (joined.includes('.') && !joined.endsWith('.html')) return joined;
  return `${joined}.html`;
}
function getKindFromRel(rel) {
  if (rel === 'products.html' || rel.startsWith('products/')) return 'products';
  if (rel === 'blog.html' || rel.startsWith('blog/')) return 'blog';
  if (rel === 'news.html' || rel.startsWith('news/')) return 'news';
  if (rel === 'index.html') return 'homepage';
  if (rel === 'sitemap.xml') return 'sitemap';
  if (rel.startsWith('industry/')) return 'industry';
  if (!rel.includes('/') && rel.endsWith('.html') && rel.startsWith('custom-')) return 'category';
  return 'page';
}
function slugFromRel(rel) {
  return rel.split('/').pop().replace(/\.html$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}
function cacheTagsForRel(rel) {
  const kind = getKindFromRel(rel);
  if (kind === 'homepage') return ['homepage'];
  if (kind === 'sitemap') return ['sitemap'];
  if (rel === 'products.html') return ['products'];
  if (rel === 'blog.html') return ['blog'];
  if (rel === 'news.html') return ['news'];
  const slug = slugFromRel(rel);
  if (kind === 'products') return ['products', 'product-slug', `product-${slug}`];
  if (kind === 'blog') return ['blog', 'blog-slug', `blog-${slug}`];
  if (kind === 'news') return ['news', 'news-slug', `news-${slug}`];
  if (kind === 'industry') return ['industry', 'industry-slug', `industry-${slug}`];
  if (kind === 'category') return ['category', 'category-slug', `category-${slug}`];
  return ['page'];
}
function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function normalizeRootHref(url, kind) {
  if (!url) return '#';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
  if (url.startsWith('/')) return url;
  if (url.startsWith(`${kind}/`)) return `/${url}`;
  if (url.endsWith('.html')) return `/${kind}/${url}`;
  return `/${url}`;
}
function normalizeImageSrc(src, sourceUrl) {
  if (!src || /^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  try {
    if (sourceUrl) return new URL(src, sourceUrl).toString();
  } catch {}
  return src;
}
function rewriteRemoteImageUrls(bodyHtml, sourceUrl) {
  if (!sourceUrl) return bodyHtml;
  return bodyHtml
    .replace(/(<img\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (all, before, src, after) => {
      return before + htmlEscape(normalizeImageSrc(src, sourceUrl)) + after;
    })
    .replace(/(<source\b[^>]*?\bsrcset=["'])([^"']+)(["'][^>]*>)/gi, (all, before, srcset, after) => {
      const rewritten = srcset.split(',').map(part => {
        const bits = part.trim().split(/\s+/);
        if (!bits[0]) return part;
        bits[0] = normalizeImageSrc(bits[0], sourceUrl);
        return bits.join(' ');
      }).join(', ');
      return before + htmlEscape(rewritten) + after;
    });
}
function stripDuplicateBodyAssets(bodyHtml) {
  // Layout already loads /assets/css/style.css and /assets/js/main.js.
  // Removing duplicate body script improves INP/TBT without changing the static HTML source files.
  return bodyHtml
    .replace(/<script\s+src=["'](?:\.\.\/|\.\/)?assets\/js\/main\.js["']\s*><\/script>/gi, '')
    .replace(/<link\s+href=["'](?:\.\.\/|\.\/)?assets\/css\/style\.css["']\s+rel=["']stylesheet["']\s*\/?>/gi, '');
}
async function readLocalHtml(rel) {
  const file = safeResolve(rel);
  if (!file) return null;
  try {
    const html = await fs.readFile(file, 'utf8');
    return { html, rel, source: 'local', sourceUrl: null };
  } catch {
    return null;
  }
}
async function fetchRemoteHtml(rel) {
  if (!isRemoteEligible(rel)) return null;
  const url = remoteUrlForRel(rel);
  if (!url) return null;

  const response = await fetch(url, {
    next: { revalidate: ISR_SECONDS, tags: [...cacheTagsForRel(rel), `path-${rel.replaceAll('/', '-')}`] }
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Remote content fetch failed for ${rel}: ${response.status}`);
  }

  const html = await response.text();
  if (!html || !/<html|<body|<section|<main|<article/i.test(html)) return null;

  return { html, rel, source: 'r2', sourceUrl: url };
}
function normalizeManifestItems(json, kind) {
  if (!json) return [];
  const raw = Array.isArray(json)
    ? json
    : (json.items || json.products || json.posts || json.news || json.blog || json.data || []);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      title: item.title || item.name || '',
      url: item.url || item.href || item.path || '',
      description: item.description || item.summary || item.excerpt || '',
      image: item.image || item.img || item.thumbnail || '',
      category: item.category || item.type || (kind === 'products' ? 'OEM & Customize' : kind.toUpperCase()),
      keywords: item.keywords || item.search || '',
      publishedTime: item.publishedTime || item.datePublished || item.publishDate || '',
      modifiedTime: item.modifiedTime || item.dateModified || item.lastmod || ''
    }))
    .filter(item => item.title && item.url);
}
async function fetchRemoteManifest(kind) {
  if (!remoteListsEnabled()) return [];
  const url = manifestUrlFor(kind);
  if (!url) return [];

  const response = await fetch(url, {
    next: { revalidate: ISR_SECONDS, tags: [kind, `${kind}-manifest`] }
  });

  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Remote ${kind} manifest fetch failed: ${response.status}`);

  const json = await response.json().catch(() => null);
  return normalizeManifestItems(json, kind);
}
function cardForItem(item, kind, sourceUrl) {
  const href = normalizeRootHref(item.url, kind);
  const title = htmlEscape(item.title);
  const desc = htmlEscape(item.description);
  const category = htmlEscape(item.category || (kind === 'products' ? 'OEM & Customize' : kind.toUpperCase()));
  const image = normalizeImageSrc(item.image, sourceUrl || manifestUrlFor(kind));

  if (kind === 'products') {
    const search = htmlEscape([item.title, item.description, item.category, item.keywords].filter(Boolean).join(' '));
    const imgHtml = image ? `<img alt="${title}" decoding="async" loading="lazy" src="${htmlEscape(image)}"/>` : '';
    return `<article class="product-card remote-r2-card" data-search="${search}"><a href="${htmlEscape(href)}">${imgHtml}<div class="card-body"><span class="tag">${category}</span><h3>${title}</h3><p>${desc}</p></div></a></article>`;
  }

  return `<article class="card remote-r2-card"><div class="card-body"><span class="tag">${category}</span><h3><a href="${htmlEscape(href)}">${title}</a></h3><p>${desc}</p></div></article>`;
}
async function augmentListingHtml(html, rel) {
  const kind = rel === 'products.html' ? 'products' : rel === 'blog.html' ? 'blog' : rel === 'news.html' ? 'news' : null;
  if (!kind) return html;

  const items = await fetchRemoteManifest(kind).catch(() => []);
  if (!items.length) return html;

  const cards = items
    .filter(item => !html.includes(`href="${normalizeRootHref(item.url, kind)}"`) && !html.includes(`href="${item.url}"`))
    .map(item => cardForItem(item, kind, manifestUrlFor(kind)))
    .join('');

  if (!cards) return html;

  return html.replace(/<div class=["']grid["']>/i, match => `${match}${cards}`);
}
async function loadHtml(params) {
  const p = await getParamObject(params);
  const rel = requestToHtmlPath(p?.path || []);

  let result = null;

  if (remoteFirstEnabled() && isRemoteEligible(rel)) {
    result = await fetchRemoteHtml(rel);
  }
  if (!result) {
    result = await readLocalHtml(rel);
  }
  if (!result && isRemoteEligible(rel)) {
    result = await fetchRemoteHtml(rel);
  }
  if (!result) notFound();

  if (result.source === 'local' && REMOTE_LISTING_PAGES.has(rel)) {
    result.html = await augmentListingHtml(result.html, rel);
  }
  return result;
}
function getTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : 'Packaging Factory Direct';
}
function getDescription(html) {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  return m ? m[1].trim() : 'B2B custom packaging manufacturer. MOQ 500 PCS. OEM and custom packaging factory.';
}
function getMeta(html, attr, name) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}
function getCanonical(html, rel, sourceUrl) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i);
  if (m) return m[1].trim();
  if (rel === 'index.html') return SITE_URL + '/';
  return `${SITE_URL}/${rel}`;
}
function getOgImage(html, sourceUrl) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (m) return normalizeImageSrc(m[1].trim(), sourceUrl);
  return `${SITE_URL}/assets/img/hero/hero-1.webp`;
}
function extractBody(html, result) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m ? m[1] : html;
  body = stripDuplicateBodyAssets(body);
  return result?.source === 'r2' ? rewriteRemoteImageUrls(body, result.sourceUrl) : body;
}
export async function generateStaticParams() {
  // Core pages, static SEO category hubs and industry solution pages are prebuilt.
  // Product/blog/news detail pages are still ISR-generated per path to avoid full catalog rebuilds.
  return [
    { path: [] },
    { path: ['index.html'] },
    { path: ['products.html'] },
    { path: ['about.html'] },
    { path: ['blog.html'] },
    { path: ['news.html'] },
    { path: ['contact.html'] },
    { path: ['custom-packaging-boxes.html'] },
    { path: ['custom-gift-boxes.html'] },
    { path: ['custom-magnetic-gift-boxes.html'] },
    { path: ['custom-stand-up-pouches.html'] },
    { path: ['custom-coffee-bags-with-valve.html'] },
    { path: ['custom-pharmaceutical-packaging-boxes.html'] },
    { path: ['custom-cosmetic-packaging-boxes.html'] },
    { path: ['custom-food-packaging.html'] },
    { path: ['custom-paper-bags.html'] },
    { path: ['custom-labels-and-stickers.html'] },
    { path: ['industry', 'cosmetic-packaging-solutions.html'] },
    { path: ['industry', 'food-and-restaurant-packaging-solutions.html'] },
    { path: ['industry', 'pharmaceutical-medical-packaging-solutions.html'] },
    { path: ['industry', 'coffee-tea-packaging-solutions.html'] },
    { path: ['industry', 'pet-food-packaging-solutions.html'] },
    { path: ['industry', 'cannabis-packaging-solutions.html'] },
    { path: ['industry', 'ecommerce-mailer-packaging-solutions.html'] },
    { path: ['industry', 'luxury-gift-packaging-solutions.html'] }
  ];
}
export async function generateMetadata({ params }) {
  const result = await loadHtml(params);
  const { html, rel, sourceUrl } = result;
  const title = getTitle(html);
  const description = getDescription(html);
  const canonical = getCanonical(html, rel, sourceUrl);
  const image = getOgImage(html, sourceUrl);
  const isProduct = rel.includes('/products/');
  const isArticle = rel.includes('/blog/') || rel.includes('/news/');
  const publishedTime = getMeta(html, 'property', 'article:published_time') || undefined;
  const modifiedTime = getMeta(html, 'property', 'article:modified_time') || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: { title, description, url: canonical, siteName: 'Packaging Factory Direct', type: isProduct ? 'product' : (isArticle ? 'article' : 'website'), images: [{ url: image }], publishedTime, modifiedTime },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    other: { 'x-pfd-content-source': result.source, 'x-pfd-isr-tags': cacheTagsForRel(rel).join(',') }
  };
}
export default async function HtmlPage({ params }) {
  const result = await loadHtml(params);
  return <main dangerouslySetInnerHTML={{ __html: extractBody(result.html, result) }} />;
}
