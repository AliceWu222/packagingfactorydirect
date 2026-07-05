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


async function readLocalIndex() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'ai-index.json'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'ai-index.json')
  ];
  for (const p of paths) {
    const t = await fs.readFile(p, 'utf8').catch(() => '');
    if (t && t.length > 100) {
      try { return JSON.parse(t); } catch {}
    }
  }
  return { site: 'Packaging Factory Direct' };
}
function deepNormalizeHost(value) {
  if (typeof value === 'string') {
    if (value.startsWith(LEGACY_SITE_URL + '/')) return SITE_URL + value.slice(LEGACY_SITE_URL.length);
    if (value === LEGACY_SITE_URL) return SITE_URL;
    return value;
  }
  if (Array.isArray(value)) return value.map(deepNormalizeHost);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = deepNormalizeHost(value[k]);
    return out;
  }
  return value;
}
export async function GET() {
  const raw = await readLocalIndex();
  const local = deepNormalizeHost(raw);
  const remoteProducts = await remoteItems('products');
  const remoteBlog = await remoteItems('blog');
  const remoteNews = await remoteItems('news');
  const payload = {
    ...local,
    version: 'v76-www-canonical',
    site: SITE_URL,
    contact: 'Linda Wang',
    email: 'linda@colorprintingpackage.com',
    whatsapp: '+86 181 6573 0353',
    moq: '500 PCS',
    businessModel: 'B2B custom packaging manufacturer, OEM/ODM, factory direct from Shenzhen. MOQ 500 PCS.',
    r2CmsEnabled: Boolean(contentBaseUrl()),
    r2CmsPolicy: 'New product/blog/news HTML may be uploaded to R2/CMS and served by exact URL through ISR without Git redeploy.',
    remoteProducts,
    remoteBlog,
    remoteNews
  };
  return Response.json(payload, { headers: { 'Cache-Control': `s-maxage=${ISR_SECONDS}, stale-while-revalidate` } });
}
