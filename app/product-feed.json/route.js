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
    keywords: item.keywords || item.search || ''
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


async function readLocalFeed() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'product-feed.json'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'product-feed.json')
  ];
  for (const p of paths) {
    const t = await fs.readFile(p, 'utf8').catch(() => '');
    if (t && t.length > 100) {
      try {
        const parsed = JSON.parse(t);
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) return parsed;
      } catch {}
    }
  }
  return { products: [] };
}
function normalizeUrlToWww(url) {
  if (!url) return url;
  if (url.startsWith(LEGACY_SITE_URL + '/')) return SITE_URL + url.slice(LEGACY_SITE_URL.length);
  if (url === LEGACY_SITE_URL) return SITE_URL;
  return url;
}
function normalizeProductForFeed(item) {
  if (!item) return item;
  const clone = { ...item };
  const rawUrl = clone.url || clone.href || clone.path || '';
  if (rawUrl) {
    const abs = absoluteSiteUrl(rawUrl, 'products');
    clone.url = normalizeUrlToWww(abs);
  }
  if (clone.image && /^https?:\/\//i.test(clone.image)) {
    clone.image = normalizeUrlToWww(clone.image);
  } else if (clone.image && !clone.image.startsWith('/') && !/^https?:/.test(clone.image)) {
    clone.image = SITE_URL + '/' + clone.image.replace(/^\/+/, '');
  } else if (clone.image && clone.image.startsWith('/')) {
    clone.image = SITE_URL + clone.image;
  }
  return clone;
}
export async function GET() {
  const local = await readLocalFeed();
  const remote = await remoteItems('products');
  const byUrl = new Map();
  for (const product of (local.products || [])) {
    const norm = normalizeProductForFeed(product);
    byUrl.set(norm.url || product.title, norm);
  }
  for (const item of remote) {
    const url = normalizeUrlToWww(absoluteSiteUrl(item.url, 'products'));
    byUrl.set(url, { ...item, url, source: 'r2-cms' });
  }
  const payload = {
    ...local,
    version: 'v76-www-canonical',
    site: SITE_URL,
    contact: 'Linda Wang',
    email: 'linda@colorprintingpackage.com',
    whatsapp: '+86 181 6573 0353',
    moq: '500 PCS',
    businessModel: 'B2B custom packaging manufacturer, OEM/ODM, factory direct from Shenzhen',
    r2CmsEnabled: Boolean(contentBaseUrl()),
    products: Array.from(byUrl.values())
  };
  return Response.json(payload, { headers: { 'Cache-Control': `s-maxage=${ISR_SECONDS}, stale-while-revalidate` } });
}
