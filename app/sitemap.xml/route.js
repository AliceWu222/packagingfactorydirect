import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;


const SITE_URL = 'https://www.packagingfactorydirect.com';
const LEGACY_SITE_URL = 'https://packagingfactorydirect.com';
const ISR_SECONDS = Number(process.env.PFD_ISR_SECONDS || process.env.PRODUCT_PAGE_REVALIDATE_SECONDS || 3600);

function contentBaseUrl() {
  return (process.env.PFD_CONTENT_BASE_URL || process.env.R2_PUBLIC_BASE_URL || process.env.CMS_CONTENT_BASE_URL || '').trim();
}
function normalizeBase(base) {
  return base && !base.endsWith('/') ? `${base}/` : base;
}
function manifestUrlFor(kind) {
  const upper = kind.toUpperCase();
  const direct = process.env[`PFD_${upper}_INDEX_URL`] || process.env[`PFD_${upper}_MANIFEST_URL`];
  if (direct) return direct;
  const base = normalizeBase(contentBaseUrl());
  if (!base) return null;
  return new URL(`data/${kind}.remote.json`, base).toString();
}
function normalizeItems(json, kind) {
  if (!json) return [];
  const raw = Array.isArray(json) ? json : (json.items || json.products || json.posts || json.news || json.blog || json.data || []);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => ({
    title: item.title || item.name || '',
    url: item.url || item.href || item.path || '',
    description: item.description || item.summary || item.excerpt || '',
    image: item.image || item.img || item.thumbnail || '',
    category: item.category || item.type || (kind === 'products' ? 'OEM & Customize' : kind.toUpperCase()),
    keywords: item.keywords || item.search || '',
    lastmod: item.lastmod || item.modifiedTime || item.dateModified || item.updatedAt || item.publishedTime || item.datePublished || ''
  })).filter(item => item.title && item.url);
}
async function remoteItems(kind) {
  const url = manifestUrlFor(kind);
  if (!url) return [];
  const response = await fetch(url, { next: { revalidate: ISR_SECONDS, tags: [kind, `${kind}-manifest`] } });
  if (response.status === 404) return [];
  if (!response.ok) return [];
  const json = await response.json().catch(() => null);
  return normalizeItems(json, kind);
}
function absoluteSiteUrl(url, kind) {
  if (!url) return SITE_URL + '/';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return SITE_URL + url;
  if (url.startsWith(`${kind}/`)) return SITE_URL + '/' + url;
  if (url.endsWith('.html') && ['products','blog','news'].includes(kind)) return SITE_URL + '/' + kind + '/' + url;
  return SITE_URL + '/' + url.replace(/^\/+/, '');
}


function xmlEscape(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
function extractLocalEntries(xml) {
  const entries = new Map();
  const blocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g)).map(m => m[1]);
  for (const block of blocks) {
    const loc = (block.match(/<loc>(.*?)<\/loc>/) || [])[1];
    if (!loc) continue;
    const lastmod = (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || '';
    const changefreq = (block.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1] || 'weekly';
    const priority = (block.match(/<priority>(.*?)<\/priority>/) || [])[1] || '0.60';
    entries.set(loc.trim(), { lastmod, changefreq, priority });
  }
  return entries;
}
function priorityFor(url) {
  if (url === SITE_URL + '/') return '1.00';
  if (url.endsWith('/products.html')) return '0.95';
  if (url.endsWith('/blog.html') || url.endsWith('/news.html')) return '0.85';
  if (url.includes('/products/')) return '0.80';
  if (url.includes('/blog/') || url.includes('/news/')) return '0.72';
  return '0.60';
}
async function readLocalSitemap() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'sitemap.xml'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'sitemap.xml')
  ];
  for (const p of paths) {
    const xml = await fs.readFile(p, 'utf8').catch(() => '');
    if (xml && xml.length > 200) return xml;
  }
  return '';
}
function normalizeToWww(loc) {
  if (!loc) return loc;
  if (loc.startsWith(LEGACY_SITE_URL + '/')) return SITE_URL + loc.slice(LEGACY_SITE_URL.length);
  if (loc === LEGACY_SITE_URL) return SITE_URL;
  return loc;
}
export async function GET() {
  const localXml = await readLocalSitemap();
  const rawEntries = extractLocalEntries(localXml);
  const entries = new Map();
  for (const [loc, meta] of rawEntries.entries()) {
    entries.set(normalizeToWww(loc), meta);
  }

  for (const kind of ['products', 'blog', 'news']) {
    const items = await remoteItems(kind);
    for (const item of items) {
      const url = absoluteSiteUrl(item.url, kind);
      if (!entries.has(url)) {
        entries.set(url, { lastmod: item.lastmod || '', changefreq: 'weekly', priority: priorityFor(url) });
      }
    }
  }

  const body = Array.from(entries.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([url, meta]) => {
    const lastmod = meta.lastmod ? `\n    <lastmod>${xmlEscape(meta.lastmod)}</lastmod>` : '';
    return `  <url>\n    <loc>${xmlEscape(url)}</loc>${lastmod}\n    <changefreq>${xmlEscape(meta.changefreq || 'weekly')}</changefreq>\n    <priority>${xmlEscape(meta.priority || priorityFor(url))}</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `s-maxage=${ISR_SECONDS}, stale-while-revalidate`,
      'X-PFD-ISR-Tags': 'sitemap,products,blog,news'
    }
  });
}
