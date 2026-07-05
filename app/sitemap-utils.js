import fs from 'node:fs/promises';
import path from 'node:path';

export const SITE_URL = 'https://www.packagingfactorydirect.com';
const LEGACY_SITE_URL = 'https://packagingfactorydirect.com';
const TODAY = '2026-07-05';

function xmlEscape(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function normalizeToWww(loc) {
  if (!loc) return loc;
  if (loc.startsWith(LEGACY_SITE_URL + '/')) return SITE_URL + loc.slice(LEGACY_SITE_URL.length);
  if (loc === LEGACY_SITE_URL) return SITE_URL;
  if (loc.startsWith('/')) return SITE_URL + loc;
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
      lastmod: (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || TODAY,
      changefreq: (block.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1] || changefreqForLoc(loc),
      priority: (block.match(/<priority>(.*?)<\/priority>/) || [])[1] || priorityForLoc(loc)
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
  return Array.from(merged.values()).filter(entry => entry.loc.startsWith(SITE_URL));
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

async function rootHtmlFiles() {
  const root = /*turbopackIgnore: true*/ process.cwd();
  const items = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const out = [];
  for (const item of items) {
    if (!item.isFile() || !item.name.endsWith('.html')) continue;
    const stat = await fs.stat(path.join(root, item.name)).catch(() => null);
    if (stat) out.push({ path: item.name, mtime: stat.mtime });
  }
  return out;
}

async function scanLocalHtmlEntries() {
  const files = [
    ...(await rootHtmlFiles()),
    ...(await walkHtml('blog')),
    ...(await walkHtml('news')),
    ...(await walkHtml('products')),
    ...(await walkHtml('industry')),
    ...(await walkHtml('cases'))
  ];
  const seen = new Map();
  for (const file of files) seen.set(file.path.replace(/\\/g, '/'), file);
  return Array.from(seen.values()).map(file => ({
    loc: file.path === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${file.path.replace(/\\/g, '/')}`,
    lastmod: (file.mtime || new Date()).toISOString().slice(0, 10),
    changefreq: changefreqForPath(file.path),
    priority: priorityForPath(file.path)
  }));
}

function changefreqForPath(filePath) {
  if (filePath === 'index.html') return 'weekly';
  if (filePath === 'products.html') return 'weekly';
  if (filePath.startsWith('products/')) return 'weekly';
  if (filePath.startsWith('blog/') || filePath.startsWith('news/')) return 'weekly';
  return 'monthly';
}

function priorityForPath(filePath) {
  if (filePath === 'index.html') return '1.00';
  if (filePath === 'products.html') return '0.95';
  if (filePath.startsWith('products/')) return '0.80';
  if (filePath.startsWith('blog/') || filePath.startsWith('news/')) return '0.72';
  if (filePath.startsWith('industry/') || filePath.startsWith('cases/')) return '0.75';
  if (!filePath.includes('/') && filePath.startsWith('custom-')) return '0.82';
  if (['contact.html','faq.html','factory-capability.html','quality-control.html','sample-process.html','shipping.html','moq-policy.html','artwork-guidelines.html','about.html'].includes(filePath)) return '0.78';
  return '0.60';
}

function changefreqForLoc(loc) {
  const pathName = loc.replace(SITE_URL + '/', '').replace(SITE_URL, 'index.html') || 'index.html';
  return changefreqForPath(pathName);
}

function priorityForLoc(loc) {
  const pathName = loc.replace(SITE_URL + '/', '').replace(SITE_URL, 'index.html') || 'index.html';
  return priorityForPath(pathName);
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
    return `  <url>\n    <loc>${xmlEscape(item.loc)}</loc>\n    <lastmod>${xmlEscape(item.lastmod || TODAY)}</lastmod>\n    <changefreq>${xmlEscape(item.changefreq || changefreqForLoc(item.loc))}</changefreq>\n    <priority>${xmlEscape(item.priority || priorityForLoc(item.loc))}</priority>\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml() {
  const files = ['sitemap.xml', 'sitemap-pages.xml', 'sitemap-products.xml', 'sitemap-blog.xml', 'sitemap-news.xml'];
  const body = files.map(file => `  <sitemap>\n    <loc>${SITE_URL}/${file}</loc>\n    <lastmod>${TODAY}</lastmod>\n  </sitemap>`).join('\n');
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
