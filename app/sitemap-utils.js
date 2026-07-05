import fs from 'node:fs/promises';
import path from 'node:path';

export const SITE_URL = 'https://www.packagingfactorydirect.com';
const LEGACY_SITE_URL = 'https://packagingfactorydirect.com';

function xmlEscape(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function normalizeToWww(loc) {
  if (!loc) return loc;
  if (loc.startsWith(LEGACY_SITE_URL + '/')) return SITE_URL + loc.slice(LEGACY_SITE_URL.length);
  if (loc === LEGACY_SITE_URL) return SITE_URL;
  return loc;
}

function extractLocalEntries(xml) {
  const entries = [];
  const blocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g)).map(m => m[1]);
  for (const block of blocks) {
    const loc = normalizeToWww((block.match(/<loc>(.*?)<\/loc>/) || [])[1] || '');
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || '2026-07-05',
      changefreq: (block.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1] || 'weekly',
      priority: (block.match(/<priority>(.*?)<\/priority>/) || [])[1] || '0.60'
    });
  }
  return entries;
}

export async function readSitemapEntries() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'sitemap.xml'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'sitemap.xml')
  ];
  let entries = [];
  for (const p of paths) {
    const xml = await fs.readFile(p, 'utf8').catch(() => '');
    if (xml && xml.length > 200) {
      entries = extractLocalEntries(xml);
      break;
    }
  }
  const scanned = await scanLocalHtmlEntries();
  const merged = new Map();
  for (const entry of entries) merged.set(entry.loc, entry);
  for (const entry of scanned) merged.set(entry.loc, { ...merged.get(entry.loc), ...entry });
  return Array.from(merged.values());
}

async function walkHtml(dir, prefix = '') {
  const root = path.join(/*turbopackIgnore: true*/ process.cwd(), dir);
  const out = [];
  const items = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    const abs = path.join(root, item.name);
    if (item.isDirectory()) {
      const nested = await walkHtml(path.join(dir, item.name), rel);
      out.push(...nested);
    } else if (item.isFile() && item.name.endsWith('.html')) {
      const stat = await fs.stat(abs).catch(() => null);
      out.push({ path: `${dir.replace(/\\/g, '/')}/${rel}`, mtime: stat?.mtime });
    }
  }
  return out;
}

async function scanLocalHtmlEntries() {
  const files = [
    ...(await walkHtml('blog')),
    ...(await walkHtml('news')),
    ...(await walkHtml('products'))
  ];
  const coreFiles = ['index.html','products.html','contact.html','faq.html','factory-capability.html','quality-control.html','sample-process.html','shipping.html','moq-policy.html','artwork-guidelines.html','about.html','blog.html','news.html'];
  for (const file of coreFiles) {
    const abs = path.join(/*turbopackIgnore: true*/ process.cwd(), file);
    const stat = await fs.stat(abs).catch(() => null);
    if (stat) files.push({ path: file, mtime: stat.mtime });
  }
  return files.map(file => ({
    loc: file.path === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${file.path.replace(/\\/g, '/')}`,
    lastmod: (file.mtime || new Date()).toISOString().slice(0, 10),
    changefreq: file.path.startsWith('blog/') || file.path.startsWith('news/') ? 'weekly' : 'monthly',
    priority: file.path === 'index.html' ? '1.00' : file.path.startsWith('products/') ? '0.80' : '0.70'
  }));
}

export function filterEntries(entries, kind) {
  if (kind === 'products') return entries.filter(item => item.loc.includes('/products/'));
  if (kind === 'blog') return entries.filter(item => item.loc.includes('/blog/'));
  if (kind === 'news') return entries.filter(item => item.loc.includes('/news/'));
  return entries.filter(item => !item.loc.includes('/products/') && !item.loc.includes('/blog/') && !item.loc.includes('/news/'));
}

export function sitemapXml(entries) {
  const deduped = new Map();
  for (const entry of entries) deduped.set(entry.loc, entry);
  const body = Array.from(deduped.values()).sort((a, b) => a.loc.localeCompare(b.loc)).map(item => {
    return `  <url>\n    <loc>${xmlEscape(item.loc)}</loc>\n    <lastmod>${xmlEscape(item.lastmod || '2026-07-05')}</lastmod>\n    <changefreq>${xmlEscape(item.changefreq || 'weekly')}</changefreq>\n    <priority>${xmlEscape(item.priority || '0.60')}</priority>\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml() {
  const today = '2026-07-05';
  const files = ['sitemap.xml', 'sitemap-pages.xml', 'sitemap-products.xml', 'sitemap-blog.xml', 'sitemap-news.xml'];
  const body = files.map(file => `  <sitemap>\n    <loc>${SITE_URL}/${file}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function xmlResponse(xml) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate'
    }
  });
}
