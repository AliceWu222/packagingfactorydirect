import fs from 'node:fs/promises';
import path from 'node:path';

export const SITE_URL = 'https://www.packagingfactorydirect.com';
const LEGACY_SITE_URL = 'https://packagingfactorydirect.com';
const ISR_SECONDS = Number(process.env.PFD_ISR_SECONDS || process.env.PRODUCT_PAGE_REVALIDATE_SECONDS || 3600);
const DEFAULT_GOOGLE_CATEGORY = 'Business & Industrial > Packaging Supplies';

export function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function readJson(rel, fallback) {
  const text = await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), rel), 'utf8').catch(() => '');
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

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

function absoluteUrl(url, kind = 'products') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url.replace(LEGACY_SITE_URL + '/', SITE_URL + '/');
  if (url.startsWith('/')) return SITE_URL + url;
  if (url.startsWith(`${kind}/`)) return `${SITE_URL}/${url}`;
  if (url.endsWith('.html') && kind) return `${SITE_URL}/${kind}/${url}`;
  return `${SITE_URL}/${url.replace(/^\/+/, '')}`;
}

function imageUrl(image) {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image.replace(LEGACY_SITE_URL + '/', SITE_URL + '/');
  if (image.startsWith('/')) return SITE_URL + image;
  return `${SITE_URL}/${image.replace(/^\/+/, '')}`;
}

function normalizeRemoteProducts(json) {
  const raw = Array.isArray(json) ? json : (json?.items || json?.products || json?.data || []);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => ({
    title: item.title || item.name || '',
    url: item.url || item.href || item.path || '',
    description: item.description || item.summary || item.excerpt || '',
    image: item.image || item.img || item.thumbnail || '',
    category: item.category || item.type || 'Custom Packaging',
    price: item.price || item.merchantPrice || item.googleMerchantPrice || '',
    brand: item.brand || 'Packaging Factory Direct',
    mpn: item.mpn || item.sku || ''
  })).filter(item => item.title && item.url);
}

async function remoteProducts() {
  const url = manifestUrlFor('products');
  if (!url) return [];
  const response = await fetch(url, { next: { revalidate: ISR_SECONDS, tags: ['products', 'products-manifest', 'merchant-feed'] } }).catch(() => null);
  if (!response || !response.ok) return [];
  const json = await response.json().catch(() => null);
  return normalizeRemoteProducts(json);
}

function productSlug(product) {
  const url = absoluteUrl(product.url || product.href || product.path || '');
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return String(product.url || '');
    }
  })();
  return pathname.split('/').pop()?.replace(/\.html$/i, '') || String(product.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function overrideFor(product, overrides) {
  const url = absoluteUrl(product.url || product.href || product.path || '');
  const slug = productSlug(product);
  const keys = [url, url.replace(SITE_URL, ''), slug, product.title].filter(Boolean);
  const products = overrides.products || overrides.items || {};
  for (const key of keys) {
    if (products[key]) return products[key];
  }
  return {};
}

function normalizePrice(value, currency = 'USD') {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return value > 0 ? `${value.toFixed(2)} ${currency}` : '';
  const raw = String(value).trim().toUpperCase();
  const full = raw.match(/^(\d+(?:\.\d{1,2})?)\s+([A-Z]{3})$/);
  if (full && Number(full[1]) > 0) return `${Number(full[1]).toFixed(2)} ${full[2]}`;
  const amount = raw.match(/^(\d+(?:\.\d{1,2})?)$/);
  if (amount && Number(amount[1]) > 0) return `${Number(amount[1]).toFixed(2)} ${currency}`;
  return '';
}

function mergeProduct(product, overrides) {
  const override = overrideFor(product, overrides);
  const currency = override.currency || product.currency || overrides.currency || 'USD';
  const price = normalizePrice(override.price || product.googleMerchantPrice || product.merchantPrice || product.price, currency);
  const link = absoluteUrl(product.url || product.href || product.path || '');
  const slug = productSlug({ ...product, url: link });
  const item = {
    id: override.id || product.id || product.sku || `pfd-${slug}`.slice(0, 120),
    title: override.title || product.title || product.name || '',
    description: override.description || product.description || product.summary || '',
    link,
    imageLink: imageUrl(override.image || product.image || product.img || product.thumbnail || ''),
    availability: override.availability || product.availability || 'in_stock',
    condition: override.condition || product.condition || 'new',
    brand: override.brand || product.brand || 'Packaging Factory Direct',
    mpn: override.mpn || product.mpn || product.sku || slug,
    googleProductCategory: override.googleProductCategory || product.googleProductCategory || DEFAULT_GOOGLE_CATEGORY,
    customLabel0: override.customLabel0 || product.category || product.type || 'Custom Packaging',
    price
  };
  const missing = [];
  if (!item.title) missing.push('title');
  if (!item.description) missing.push('description');
  if (!item.link) missing.push('link');
  if (!item.imageLink) missing.push('image_link');
  if (!item.price) missing.push('price');
  return { ...item, eligible: missing.length === 0, missing };
}

export async function merchantFeedData() {
  const local = await readJson('product-feed.json', { products: [] });
  const overrides = await readJson('data/google-merchant-overrides.json', {});
  const byUrl = new Map();
  for (const product of (local.products || [])) {
    const link = absoluteUrl(product.url || '');
    byUrl.set(link || product.title, product);
  }
  for (const product of await remoteProducts()) {
    const link = absoluteUrl(product.url || '');
    byUrl.set(link || product.title, product);
  }
  const products = Array.from(byUrl.values()).map(product => mergeProduct(product, overrides));
  return {
    version: 'v101-google-merchant-feed',
    site: SITE_URL,
    generatedAt: new Date().toISOString(),
    overrideFile: 'data/google-merchant-overrides.json',
    totalProducts: products.length,
    eligibleProducts: products.filter(item => item.eligible),
    missingPriceCount: products.filter(item => item.missing.includes('price')).length,
    ineligibleProducts: products.filter(item => !item.eligible).map(item => ({
      id: item.id,
      title: item.title,
      link: item.link,
      missing: item.missing
    }))
  };
}
