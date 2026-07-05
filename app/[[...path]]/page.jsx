import fs from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 3600;

const ROOT = /*turbopackIgnore: true*/ process.cwd();
const SITE_URL = 'https://www.packagingfactorydirect.com';
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
  // Also strip any other <link> to style.css so we can inject a versioned one via layout only.
  return bodyHtml
    .replace(/<script\s+src=["'](?:\.\.\/|\.\/)?assets\/js\/main\.js["']\s*><\/script>/gi, '')
    .replace(/<link\s+href=["'](?:\.\.\/|\.\/)?assets\/css\/style\.css["']\s+rel=["']stylesheet["']\s*\/?>/gi, '')
    .replace(/<link\s+rel=["']stylesheet["']\s+href=["'](?:\.\.\/|\.\/)?assets\/css\/style\.css["']\s*\/?>/gi, '');
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
function getDescription(html, rel) {
  // Runtime descriptions intentionally override older static meta on strategic pages.
  const kind = getKindFromRel(rel);
  const slug = slugFromRel(rel).replace(/-/g, ' ');
  const short = slug.charAt(0).toUpperCase() + slug.slice(1);
  const strategicDescriptions = {
    'faq.html': 'FAQ for B2B custom packaging buyers: MOQ 500 PCS, OEM/ODM options, sample process, artwork files, materials, printing finishes, lead time, shipping and RFQ requirements.',
    'factory-capability.html': 'Factory capability for custom packaging buyers: OEM/ODM boxes, bags, pouches and printed paper packaging with MOQ 500 PCS, custom dielines, material sourcing and export production support.',
    'quality-control.html': 'Quality control process for B2B custom packaging orders, covering material checks, artwork review, printing inspection, finishing approval, carton packing and pre-shipment checks.',
    'sample-process.html': 'Custom packaging sample process for B2B buyers: dieline review, artwork check, material confirmation, prototype sampling, buyer approval and mass production setup.',
    'shipping.html': 'Shipping and lead time guide for custom packaging orders, including carton packing, export delivery, destination planning, sample timing and worldwide freight coordination.',
    'moq-policy.html': 'MOQ 500 PCS policy for custom packaging buyers, covering custom boxes, paper bags, pouches, labels and printed packaging with factory-direct OEM/ODM production.',
    'artwork-guidelines.html': 'Artwork guidelines for custom packaging RFQ: dielines, bleed, CMYK and Pantone color, logo files, fonts, barcode placement, prepress checks and print-ready packaging files.',
    'custom-packaging-boxes.html': 'Custom packaging boxes manufacturer for B2B buyers. MOQ 500 PCS, OEM/ODM rigid boxes, folding cartons, mailer boxes, gift boxes, custom size, printing and finishes.',
    'custom-gift-boxes.html': 'Custom gift boxes manufacturer for brands, importers and retailers. MOQ 500 PCS, OEM/ODM rigid boxes, magnetic boxes, inserts, foil stamping and premium print finishes.',
    'custom-magnetic-gift-boxes.html': 'Custom magnetic gift boxes manufacturer with MOQ 500 PCS, foldable or rigid structures, logo printing, foil stamping, inserts and premium retail packaging support.',
    'custom-stand-up-pouches.html': 'Custom stand up pouches manufacturer for food, coffee, pet food, supplements and cosmetics. MOQ 500 PCS, laminated film, zipper, valve, spout and custom printing.',
    'custom-coffee-bags-with-valve.html': 'Custom coffee bags with valve for roasters and beverage brands. MOQ 500 PCS, flat bottom or stand up pouches, degassing valve, zipper and branded printing.',
    'custom-pharmaceutical-packaging-boxes.html': 'Custom pharmaceutical packaging boxes manufacturer for medical and healthcare buyers. MOQ 500 PCS, serialized cartons, GS1/DataMatrix support, security labels and QC checks.',
    'custom-cosmetic-packaging-boxes.html': 'Custom cosmetic packaging boxes manufacturer for skincare, beauty and makeup brands. MOQ 500 PCS, OEM/ODM cartons, rigid boxes, labels, inserts and premium finishes.',
    'custom-food-packaging.html': 'Custom food packaging manufacturer for restaurants, bakeries, snacks and beverage brands. MOQ 500 PCS, food boxes, bags, wraps, trays, greaseproof paper and branded printing.',
    'custom-paper-bags.html': 'Custom paper bags manufacturer for retail, gift, apparel and luxury brands. MOQ 500 PCS, kraft or art paper, handles, logo printing, foil stamping and OEM sizes.',
    'custom-labels-and-stickers.html': 'Custom labels and stickers manufacturer for B2B packaging buyers. MOQ 500 PCS, product labels, security labels, QR codes, foil look, waterproof options and custom rolls or sheets.'
  };
  if (strategicDescriptions[rel]) return strategicDescriptions[rel];
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (m) return m[1].trim();
  const kw = short.length > 6 ? short : 'custom packaging';
  if (rel === 'index.html') return 'Packaging Factory Direct is a B2B custom packaging manufacturer offering OEM/ODM boxes, bags, pouches, labels and paper printing. MOQ 500 PCS, factory direct from Shenzhen, worldwide shipping.';
  if (rel === 'products.html') return 'Browse the full custom packaging product catalog: gift boxes, magnetic boxes, mailer boxes, stand-up pouches, coffee bags, pharma cartons, paper bags and labels. MOQ 500 PCS, factory direct, OEM and ODM supported.';
  if (rel === 'blog.html') return 'Packaging manufacturer blog with technical guides on custom gift boxes, magnetic packaging, mailer boxes, paper bags, food packaging, pharma cartons and B2B RFQ best practices. Written for procurement teams and brand owners.';
  if (rel === 'news.html') return 'Latest updates from Packaging Factory Direct on market trends, new packaging categories, MOQ policy, factory capability and supplier procurement news for B2B custom packaging buyers.';
  if (rel === 'about.html') return 'About Packaging Factory Direct — a Shenzhen-based B2B custom packaging manufacturer serving global brands with OEM/ODM boxes, bags, pouches and printing. MOQ 500 PCS, factory direct pricing.';
  if (rel === 'contact.html') return 'Contact Packaging Factory Direct for a factory-direct quotation. Reach Linda Wang via WhatsApp, email or RFQ form for custom packaging with MOQ 500 PCS, OEM/ODM support and worldwide shipping.';
  if (kind === 'products') return `${short} custom packaging manufacturer page for B2B buyers. MOQ 500 PCS, OEM/ODM, factory direct pricing, material/application/industry guidance and RFQ support from Shenzhen.`;
  if (kind === 'blog') return `${short} — technical guide from Packaging Factory Direct. Custom packaging manufacturer, MOQ 500 PCS, OEM/ODM, factory-direct RFQ support.`;
  if (kind === 'news') return `${short} — market update from Packaging Factory Direct, B2B custom packaging manufacturer. MOQ 500 PCS, factory direct, OEM/ODM.`;
  if (kind === 'industry') return `${short} — industry packaging solutions from Packaging Factory Direct. Custom manufacturer, MOQ 500 PCS, OEM/ODM, factory direct.`;
  if (kind === 'category') return `${short} — category from Packaging Factory Direct. B2B custom packaging manufacturer, MOQ 500 PCS, OEM/ODM, factory direct pricing.`;
  return `${short} — Packaging Factory Direct, B2B custom packaging manufacturer. MOQ 500 PCS, OEM/ODM, factory direct.`;
}
function getMeta(html, attr, name) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}
function getCanonical(html, rel, sourceUrl) {
  if (rel === 'index.html') return SITE_URL + '/';
  return `${SITE_URL}/${rel}`;
}
function getOgImage(html, sourceUrl) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (m) return normalizeImageSrc(m[1].trim(), sourceUrl);
  return `${SITE_URL}/assets/img/hero/hero-1.webp`;
}
function repairCorruptedLogoMarkup(bodyHtml) {
  // Server-side repair for legacy mojibake like: <span class="logo-mark">▖?/span>
  // Runtime DOM repair may run too late or fail when the broken span swallows sibling text.
  return bodyHtml
    .replace(/<span class=["']logo-mark["']>[^<]{0,12}\?\/span>\s*<span>/gi, '<span class="logo-mark">▱</span><span>')
    .replace(/<span class=["']logo-mark["']>[^<]{0,12}锟[^<]*<span>/gi, '<span class="logo-mark">▱</span><span>')
    .replace(/<span class=["']logo-mark["']>[^<]{0,12}\ufffd[^<]*<span>/gi, '<span class="logo-mark">▱</span><span>');
}
function extractBody(html, result) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m ? m[1] : html;
  body = stripDuplicateBodyAssets(body);
  body = repairCorruptedLogoMarkup(body);
  return result?.source === 'r2' ? rewriteRemoteImageUrls(body, result.sourceUrl) : body;
}

function normalizeHomepageSemanticH1(bodyHtml, rel) {
  if (rel !== 'index.html') return bodyHtml;
  let seen = 0;
  return bodyHtml.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (all, attrs, content) => {
    seen += 1;
    if (seen === 1) return all;
    return `<h2${attrs}>${content}</h2>`;
  });
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
  const description = getDescription(html, rel);
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
function firstImageAbsoluteUrl(html, sourceUrl) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (og && og[1]) return normalizeImageSrc(og[1].trim(), sourceUrl || SITE_URL + '/');
  const gm = html.match(/<div[^>]*class=["'][^"']*gallery-main[^"']*["'][^>]*>[\s\S]*?<img[^>]*\bsrc=["']([^"']+)["']/i);
  if (gm && gm[1]) {
    const raw = gm[1].trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const clean = raw.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
    return SITE_URL + (clean.startsWith('/') ? clean : '/' + clean);
  }
  const anyImg = html.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (anyImg && anyImg[1]) {
    const raw = anyImg[1].trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const clean = raw.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
    return SITE_URL + (clean.startsWith('/') ? clean : '/' + clean);
  }
  return `${SITE_URL}/assets/img/hero/hero-1.webp`;
}

function firstParagraphText(html) {
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!p) return '';
  return p[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function productJsonLd(html, rel, title, description, sourceUrl) {
  const image = firstImageAbsoluteUrl(html, sourceUrl);
  const cleanName = title.replace(/\s*\|\s*.+$/, '').trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanName,
    description: description,
    image: image,
    brand: { '@type': 'Brand', name: 'Packaging Factory Direct' },
    manufacturer: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
    category: 'Custom Packaging',
    material: 'Greyboard, art paper, kraft paper, corrugated board, PET/PLA film, laminated flexible packaging materials, foil and specialty paper depending on product application',
    printingOptions: ['Offset printing', 'Digital printing', 'Flexographic printing', 'Gravure printing', 'CMYK', 'Pantone color matching', 'Custom logo printing'],
    finishOptions: ['Matte lamination', 'Gloss lamination', 'Soft-touch lamination', 'Foil stamping', 'Embossing', 'Debossing', 'Spot UV', 'Window patching'],
    applications: ['Retail packaging', 'Ecommerce shipping', 'Food packaging', 'Cosmetic packaging', 'Gift packaging', 'Pharma packaging', 'Branded promotional packaging'],
    industries: ['Food', 'Beverage', 'Coffee and tea', 'Cosmetics', 'Skincare', 'Apparel', 'Gifts', 'Ecommerce', 'Pharmaceutical', 'Pet food', 'Cannabis where compliant'],
    moq: '500 PCS',
    oemOdm: 'OEM/ODM custom packaging supported',
    customSize: 'Custom size, structure and dieline supported',
    url: `${SITE_URL}/${rel}`,
    rfqContact: { '@type': 'ContactPoint', contactType: 'sales', name: 'Linda Wang', email: 'linda@colorprintingpackage.com', telephone: '+86-181-6573-0353', url: `${SITE_URL}/contact.html` },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'MOQ', value: '500 PCS' },
      { '@type': 'PropertyValue', name: 'Customization', value: 'Yes, OEM/ODM supported' },
      { '@type': 'PropertyValue', name: 'Custom size support', value: 'Custom size, structure and dieline supported' },
      { '@type': 'PropertyValue', name: 'Printing options', value: 'Offset printing, digital printing, flexographic printing, CMYK, Pantone color and custom logo printing' },
      { '@type': 'PropertyValue', name: 'Finish options', value: 'Matte lamination, gloss lamination, soft-touch lamination, foil stamping, embossing, debossing, spot UV and window patching' },
      { '@type': 'PropertyValue', name: 'Applications', value: 'Retail packaging, ecommerce shipping, food packaging, cosmetic packaging, gift packaging, pharma packaging and branded promotional packaging' },
      { '@type': 'PropertyValue', name: 'Industries', value: 'Food, beverage, coffee and tea, cosmetics, skincare, apparel, gifts, ecommerce, pharmaceutical, pet food and cannabis where compliant' },
      { '@type': 'PropertyValue', name: 'OEM/ODM', value: 'OEM and ODM custom packaging manufacturing supported' },
      { '@type': 'PropertyValue', name: 'RFQ contact', value: 'Send size, quantity, material, printing colors, finish, destination country and artwork file for quotation' },
      { '@type': 'PropertyValue', name: 'Business Model', value: 'B2B, factory direct, RFQ only' }
    ],
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceSpecification: { '@type': 'PriceSpecification', description: 'B2B RFQ required. MOQ 500 PCS. No public retail price.' },
      url: `${SITE_URL}/${rel}`,
      seller: {
        '@type': 'Organization',
        name: 'Packaging Factory Direct',
        contactPoint: { '@type': 'ContactPoint', contactType: 'sales', name: 'Linda Wang', email: 'linda@colorprintingpackage.com', telephone: '+86-181-6573-0353' }
      }
    }
  };
}

function articleJsonLd(html, rel, title, description, sourceUrl) {
  const image = firstImageAbsoluteUrl(html, sourceUrl);
  const publishedTime = getMeta(html, 'property', 'article:published_time') || undefined;
  const modifiedTime = getMeta(html, 'property', 'article:modified_time') || undefined;
  const isNews = rel.startsWith('news/');
  return {
    '@context': 'https://schema.org',
    '@type': isNews ? 'NewsArticle' : 'Article',
    headline: title.replace(/\s*\|\s*.+$/, '').trim(),
    description: description,
    image: [image],
    articleSection: isNews ? 'Packaging Industry News' : 'Custom Packaging Buyer Guide',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/${rel}` },
    author: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Packaging Factory Direct',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` }
    },
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime
  };
}

const TRUST_PAGES = {
  'factory-capability.html': {
    name: 'Factory Capability',
    about: 'Factory-direct custom packaging manufacturing capability for B2B buyers, including structure, material, printing, finishing and OEM/ODM production support.'
  },
  'quality-control.html': {
    name: 'Quality Control',
    about: 'Custom packaging quality control process covering material checks, printing inspection, dieline confirmation, finishing review and pre-shipment checks.'
  },
  'sample-process.html': {
    name: 'Sample Process',
    about: 'Custom packaging sample process for B2B buyers, including dieline review, artwork check, sample confirmation and mass production approval.'
  },
  'shipping.html': {
    name: 'Shipping and Lead Time',
    about: 'Worldwide shipping, carton packing, export delivery and lead time guidance for custom packaging orders.'
  },
  'moq-policy.html': {
    name: 'MOQ Policy',
    about: 'MOQ 500 PCS policy for custom boxes, bags, pouches, labels and paper printing orders from Packaging Factory Direct.'
  },
  'artwork-guidelines.html': {
    name: 'Artwork Guidelines',
    about: 'Artwork, dieline, color, bleed, font and prepress requirements for custom packaging RFQ and production.'
  }
};

function collectionPageJsonLd(html, rel, title, description) {
  if (getKindFromRel(rel) !== 'category') return null;
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']*\/products\/[^"']+\.html|[^"']*products\/[^"']+\.html|[^"']*\.html)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((m) => {
      const href = normalizeRootHref(m[1], 'products');
      if (!href.includes('/products/') && !href.startsWith('/products/')) return null;
      const name = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        '@type': 'ListItem',
        position: 0,
        url: href.startsWith('http') ? href : `${SITE_URL}${href.startsWith('/') ? href : `/${href}`}`,
        name: name || href.split('/').pop().replace(/\.html$/i, '').replace(/-/g, ' ')
      };
    })
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const item of links) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push({ ...item, position: unique.length + 1 });
    if (unique.length >= 24) break;
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: title.replace(/\s*\|\s*.+$/, '').trim(),
        description,
        url: `${SITE_URL}/${rel}`,
        about: 'B2B custom packaging category page for OEM/ODM buyers, brands, importers and distributors.',
        isPartOf: { '@type': 'WebSite', name: 'Packaging Factory Direct', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL }
      },
      {
        '@type': 'ItemList',
        name: `${title.replace(/\s*\|\s*.+$/, '').trim()} product list`,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        numberOfItems: unique.length,
        itemListElement: unique
      }
    ]
  };
}

function trustPageJsonLd(rel, title, description) {
  const meta = TRUST_PAGES[rel];
  if (!meta) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title.replace(/\s*\|\s*.+$/, '').trim() || meta.name,
    description: description || meta.about,
    url: `${SITE_URL}/${rel}`,
    about: meta.about,
    isPartOf: { '@type': 'WebSite', name: 'Packaging Factory Direct', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL }
  };
}

function faqPageJsonLd(rel) {
  if (rel !== 'faq.html') return null;
  const questions = [
    ['What is the MOQ for custom packaging?', 'MOQ starts from 500 PCS for custom packaging orders, including boxes, bags, pouches, labels and printed paper packaging.'],
    ['How do I request a custom packaging quote?', 'Send product size, quantity, material, printing colors, finish, destination country and artwork file through the contact form, email or WhatsApp.'],
    ['Can you make custom size packaging?', 'Yes. Packaging Factory Direct supports custom size, custom structure, custom dieline and OEM/ODM packaging production.'],
    ['Do you support OEM/ODM packaging?', 'Yes. OEM and ODM custom packaging is supported for B2B buyers, brands, importers, distributors and ecommerce sellers.'],
    ['How long does sampling take?', 'Sampling time depends on structure, material and finish. A dieline and artwork check is recommended before sample production.']
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  };
}

function hasInlineJsonLdOfType(html, type) {
  const re = new RegExp(`<script[^>]+application/ld\\+json[^>]*>([\\s\\S]*?)</script>`, 'gi');
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] || '').trim();
    if (!raw) continue;
    const normalized = raw.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;/g, "'");
    try {
      const parsed = JSON.parse(normalized);
      if (jsonLdContainsType(parsed, type)) return true;
    } catch {
      const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactDouble = new RegExp(`"@type"\\s*:\\s*(?:\\[[^\\]]*)?"${escapedType}"`, 'i');
      const exactSingle = new RegExp(`'@type'\\s*:\\s*(?:\\[[^\\]]*)?'${escapedType}'`, 'i');
      if (exactDouble.test(normalized) || exactSingle.test(normalized)) return true;
    }
  }
  return false;
}

function jsonLdContainsType(value, type) {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(item => jsonLdContainsType(item, type));
  if (typeof value !== 'object') return false;
  const ownType = value['@type'];
  if (ownType === type) return true;
  if (Array.isArray(ownType) && ownType.includes(type)) return true;
  if (Array.isArray(value['@graph']) && value['@graph'].some(item => jsonLdContainsType(item, type))) return true;
  return false;
}

function breadcrumbJsonLd(rel) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }];
  if (rel === 'index.html' || !rel) return null;
  const kind = getKindFromRel(rel);
  const slugText = slugFromRel(rel).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (kind === 'products' && rel !== 'products.html') {
    items.push({ '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else if (kind === 'blog' && rel !== 'blog.html') {
    items.push({ '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else if (kind === 'news' && rel !== 'news.html') {
    items.push({ '@type': 'ListItem', position: 2, name: 'News', item: `${SITE_URL}/news.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else if (kind === 'industry') {
    items.push({ '@type': 'ListItem', position: 2, name: 'Industry Solutions', item: `${SITE_URL}/products.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else {
    const label = rel === 'products.html' ? 'Products'
      : rel === 'blog.html' ? 'Blog'
      : rel === 'news.html' ? 'News'
      : rel === 'about.html' ? 'About Us'
      : rel === 'contact.html' ? 'Contact'
      : slugText;
    items.push({ '@type': 'ListItem', position: 2, name: label, item: `${SITE_URL}/${rel}` });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function buyerGuideSection(kind, rel) {
  // Additive-only buyer guide links, rendered AFTER the original body.
  // Never appears on: homepage (index.html), products list, blog list, news list, or the 7 trust pages themselves.
  // Product detail: append a compact buyer-guide box.
  // Blog/news detail: append related product-category shortcuts + buyer-guide links.
  const TRUST_LINKS = [
    ['/factory-capability.html', 'Factory Capability'],
    ['/quality-control.html', 'Quality Control'],
    ['/sample-process.html', 'Sample Process'],
    ['/artwork-guidelines.html', 'Artwork Guidelines'],
    ['/moq-policy.html', 'MOQ Policy'],
    ['/shipping.html', 'Shipping & Packing'],
    ['/faq.html', 'Buyer FAQ']
  ];
  const CATEGORY_LINKS = [
    ['/custom-packaging-boxes.html', 'Custom Packaging Boxes'],
    ['/custom-gift-boxes.html', 'Custom Gift Boxes'],
    ['/custom-magnetic-gift-boxes.html', 'Custom Magnetic Gift Boxes'],
    ['/custom-stand-up-pouches.html', 'Custom Stand Up Pouches'],
    ['/custom-coffee-bags-with-valve.html', 'Custom Coffee Bags with Valve'],
    ['/custom-pharmaceutical-packaging-boxes.html', 'Custom Pharmaceutical Packaging Boxes'],
    ['/custom-cosmetic-packaging-boxes.html', 'Custom Cosmetic Packaging Boxes'],
    ['/custom-food-packaging.html', 'Custom Food Packaging'],
    ['/custom-paper-bags.html', 'Custom Paper Bags'],
    ['/custom-labels-and-stickers.html', 'Custom Labels and Stickers']
  ];
  const trustLis = TRUST_LINKS.map(([u,t]) => `<li><a href="${u}">${t}</a></li>`).join('');
  const catLis = CATEGORY_LINKS.map(([u,t]) => `<li><a href="${u}">${t}</a></li>`).join('');

  // Product detail: only trust links (categories link back would be redundant here since related products already shown)
  if (kind === 'products' && rel !== 'products.html') {
    return `<section class="section" data-injected="buyer-guide"><div class="container"><h2>What to Send for Quotation</h2><p>For a fast factory-direct RFQ, send product size, order quantity, material, printing colors, finish, destination country and artwork file. MOQ 500 PCS. OEM/ODM custom size packaging is supported.</p><ul><li>Product size and structure or reference photo</li><li>Quantity and target delivery country</li><li>Material, thickness and application industry</li><li>Printing colors, logo file and artwork format</li><li>Finish request: matte, gloss, foil, embossing, spot UV, window or insert</li></ul><h2>Materials, Processes and Applications</h2><p>Common custom packaging options include greyboard, kraft paper, corrugated board, coated paperboard, specialty paper and laminated flexible film. Printing and finishing can include CMYK, Pantone matching, foil stamping, embossing, debossing, spot UV, matte or gloss lamination, soft-touch coating, windows and inserts.</p><ul><li>Applications: retail display, ecommerce shipping, gift sets, food, cosmetics, pharma, coffee, apparel and promotional packaging</li><li>Sample process: dieline review, artwork check, material confirmation, sample approval and mass production setup</li><li>Shipping notes: confirm carton packing, destination country, delivery method and lead-time target before production</li></ul><h2>Related RFQ FAQ</h2><dl><dt>What is the MOQ?</dt><dd>MOQ starts from 500 PCS for custom packaging orders.</dd><dt>Can you make custom size and structure?</dt><dd>Yes. OEM/ODM custom size, dieline and structure are supported after artwork and material review.</dd><dt>What affects quotation speed?</dt><dd>Size, quantity, material, printing colors, finish, destination country and artwork file are the key RFQ fields.</dd><dt>Can I approve a sample before mass production?</dt><dd>Yes. Buyers can confirm dieline, artwork, material and sample before production setup.</dd></dl><h2>Buyer-Guide Pages</h2><p>Complete B2B buyer resources: factory capability, quality control, sample process, MOQ, artwork, shipping and FAQ.</p><ul>${trustLis}</ul><h2>Related Product Categories</h2><ul>${catLis}</ul></div></section>`;
  }
  // Blog/news detail: trust links + category shortcuts to relevant products
  if ((kind === 'blog' || kind === 'news') && rel !== 'blog.html' && rel !== 'news.html') {
    return `<section class="section" data-injected="buyer-guide"><div class="container"><h2>Related Custom Packaging Categories</h2><ul>${catLis}</ul><h2>Buyer-Guide Pages</h2><ul>${trustLis}</ul></div></section>`;
  }
  return '';
}

export default async function HtmlPage({ params }) {
  const result = await loadHtml(params);
  const { html, rel, sourceUrl } = result;
  const bc = breadcrumbJsonLd(rel);
  const kind = getKindFromRel(rel);
  const title = getTitle(html);
  const description = getDescription(html, rel);
  const bodyHtml = normalizeHomepageSemanticH1(extractBody(html, result), rel);
  const buyerGuide = buyerGuideSection(kind, rel);
  const trustSchema = trustPageJsonLd(rel, title, description);
  const faqSchema = faqPageJsonLd(rel);
  const collectionSchema = collectionPageJsonLd(html, rel, title, description);

  // Original static <head> content is not rendered inside the extracted body,
  // so SEO schemas are injected here at the App Router layer.
  const injectProduct = kind === 'products' && rel !== 'products.html';
  const articleType = kind === 'news' ? 'NewsArticle' : 'Article';
  const injectArticle = (kind === 'blog' || kind === 'news') && rel !== 'blog.html' && rel !== 'news.html' && !hasInlineJsonLdOfType(bodyHtml, articleType);
  const injectTrust = Boolean(trustSchema);
  const injectFaq = Boolean(faqSchema);
  const injectCollection = Boolean(collectionSchema);

  return (
    <>
      {bc ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bc) }}
        />
      ) : null}
      {injectProduct ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(html, rel, title, description, sourceUrl)) }}
        />
      ) : null}
      {injectArticle ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(html, rel, title, description, sourceUrl)) }}
        />
      ) : null}
      {injectTrust ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(trustSchema) }}
        />
      ) : null}
      {injectFaq ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      {injectCollection ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      ) : null}
      <main dangerouslySetInnerHTML={{ __html: bodyHtml + buyerGuide }} />
    </>
  );
}
