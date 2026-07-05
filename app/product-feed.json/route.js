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
function procurementProfile(item) {
  const text = `${item.title || item.name || ''} ${item.description || ''} ${item.category || ''} ${item.tags || ''} ${item.search || ''}`.toLowerCase();
  const isFlexible = /pouch|bag|mylar|film|coffee|valve|spout|zipper|stand[- ]?up/.test(text);
  const isFood = /food|coffee|tea|bakery|cookie|chocolate|pizza|burger|salad|noodle|cupcake|donut|takeaway|greaseproof/.test(text);
  const isPharma = /pharma|medical|medicine|steril|datamatrix|gs1|security|anti-counterfeit/.test(text);
  const isCosmetic = /cosmetic|skincare|beauty|cream|serum|lip|makeup/.test(text);
  const isGift = /gift|rigid|magnetic|jewelry|drawer|insert|thank you|tissue/.test(text);
  const materials = isFlexible
    ? ['PET/PE', 'MOPP/VMPET/PE', 'kraft paper laminate', 'PLA/PBS compostable film options']
    : ['greyboard', 'art paper', 'kraft paper', 'corrugated board', 'specialty paper'];
  const applications = [
    isFood ? 'food and beverage packaging' : '',
    isPharma ? 'pharmaceutical and medical packaging' : '',
    isCosmetic ? 'cosmetic and skincare packaging' : '',
    isGift ? 'gift and premium retail packaging' : '',
    isFlexible ? 'flexible packaging and refill pouches' : 'retail product packaging'
  ].filter(Boolean);
  const industries = [
    isFood ? 'food' : '',
    isPharma ? 'pharmaceutical' : '',
    isCosmetic ? 'cosmetics' : '',
    isGift ? 'gifts and luxury retail' : '',
    isFlexible ? 'coffee, tea, pet food and snacks' : 'ecommerce and retail brands'
  ].filter(Boolean);
  return {
    moq: item.moq || '500 PCS',
    materials: item.materials || materials,
    printingOptions: item.printingOptions || ['CMYK printing', 'Pantone color matching', 'custom logo printing', isFlexible ? 'gravure/flexographic printing' : 'offset printing'],
    finishOptions: item.finishOptions || ['matte lamination', 'gloss lamination', 'soft-touch lamination', 'foil stamping', 'embossing/debossing', 'spot UV'],
    applications: item.applications || Array.from(new Set(applications)),
    industries: item.industries || Array.from(new Set(industries)),
    customSize: item.customSize || 'Custom size, structure and dieline supported',
    leadTime: item.leadTime || 'Sampling and mass production lead time depend on structure, material, finish and order quantity; confirm during RFQ.',
    sampleAvailable: item.sampleAvailable ?? true,
    buyerIntentKeywords: item.buyerIntentKeywords || ['custom packaging manufacturer', 'MOQ 500 PCS', 'OEM/ODM packaging', 'factory direct packaging', 'request packaging quote'],
    rfqContact: item.rfqContact || { contact: 'Linda Wang', email: 'linda@colorprintingpackage.com', whatsapp: '+86 181 6573 0353', url: `${SITE_URL}/contact.html` },
    relatedGuides: item.relatedGuides || [`${SITE_URL}/factory-capability.html`, `${SITE_URL}/quality-control.html`, `${SITE_URL}/sample-process.html`, `${SITE_URL}/artwork-guidelines.html`, `${SITE_URL}/shipping.html`, `${SITE_URL}/moq-policy.html`]
  };
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
  return { ...clone, ...procurementProfile(clone) };
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
    byUrl.set(url, normalizeProductForFeed({ ...item, url, source: 'r2-cms' }));
  }
  const payload = {
    ...local,
    version: 'v97-procurement-feed',
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
