import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = /*turbopackIgnore: true*/ process.cwd();
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
function normalize(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function expandQuery(query) {
  return normalize(query).split(' ').filter(Boolean);
}
function normalizeItems(json) {
  if (!json) return [];
  const raw = Array.isArray(json) ? json : (json.products || json.items || json.data || []);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => ({
    title: item.title || item.name || '',
    url: item.url || item.href || item.path || '',
    description: item.description || item.summary || item.excerpt || '',
    image: item.image || item.img || item.thumbnail || '',
    category: item.category || item.type || '',
    search: item.search || item.keywords || ''
  })).filter(item => item.title && item.url);
}
async function localProducts() {
  const files = ['product-feed.json', 'ai-index.json', 'data/products.manifest.json'];
  const byUrl = new Map();
  for (const file of files) {
    try {
      const json = JSON.parse(await fs.readFile(path.join(/*turbopackIgnore: true*/ ROOT, file), 'utf8'));
      for (const item of normalizeItems(json)) byUrl.set(item.url, item);
    } catch {}
  }
  return Array.from(byUrl.values());
}
async function remoteProducts() {
  const url = manifestUrlFor('products');
  if (!url) return [];
  const response = await fetch(url, { next: { revalidate: ISR_SECONDS, tags: ['products', 'products-manifest'] } });
  if (!response.ok) return [];
  const json = await response.json().catch(() => null);
  return normalizeItems(json);
}
function scoreItem(item, terms, rawQuery) {
  const haystack = normalize([item.title, item.description, item.category, item.search, item.url].join(' '));
  if (!terms.length) return 1;
  if (rawQuery && haystack.includes(rawQuery)) return 100;
  if (terms.every(term => haystack.includes(term))) return terms.length;
  return 0;
}
export async function GET(request) {
  const query = request.nextUrl.searchParams.get('q') || '';
  const rawQuery = normalize(query);
  const terms = expandQuery(query);
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 24), 60);

  const items = [...await localProducts(), ...await remoteProducts()];
  const byUrl = new Map();
  for (const item of items) byUrl.set(item.url, item);

  const results = Array.from(byUrl.values())
    .map(item => ({ ...item, score: scoreItem(item, terms, rawQuery) }))
    .filter(item => !terms.length || item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return Response.json({
    ok: true,
    query,
    count: results.length,
    results
  }, {
    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=600' }
  });
}
