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
function classifiedPages(remoteProducts, remoteBlog, remoteNews) {
  const core = (url, title, type, buyerIntent) => ({ url: SITE_URL + url, title, type, buyerIntent });
  return {
    homepage: [core('/', 'Packaging Factory Direct homepage', 'homepage', 'custom packaging manufacturer overview, MOQ 500 PCS and RFQ entry')],
    productCategories: [
      core('/products.html', 'All custom packaging products', 'product-index', 'browse custom packaging product categories'),
      core('/custom-packaging-boxes.html', 'Custom packaging boxes', 'category', 'paperboard boxes and folding cartons RFQ'),
      core('/custom-gift-boxes.html', 'Custom gift boxes', 'category', 'premium gift box RFQ'),
      core('/custom-magnetic-gift-boxes.html', 'Custom magnetic gift boxes', 'category', 'rigid magnetic box RFQ'),
      core('/custom-stand-up-pouches.html', 'Custom stand up pouches', 'category', 'flexible pouch RFQ'),
      core('/custom-coffee-bags-with-valve.html', 'Custom coffee bags with valve', 'category', 'coffee packaging RFQ'),
      core('/custom-food-packaging.html', 'Custom food packaging', 'category', 'food packaging material RFQ'),
      core('/custom-pharmaceutical-packaging-boxes.html', 'Custom pharmaceutical packaging boxes', 'category', 'pharma packaging RFQ')
    ],
    productDetails: remoteProducts.map(item => ({ ...item, type: 'product-detail', buyerIntent: 'request quote for custom packaging, MOQ 500 PCS, OEM/ODM supported' })),
    industryPages: [
      core('/industry/food-and-restaurant-packaging-solutions.html', 'Food and restaurant packaging solutions', 'industry', 'food-safe packaging procurement'),
      core('/industry/pharmaceutical-medical-packaging-solutions.html', 'Pharmaceutical medical packaging solutions', 'industry', 'medical and pharma packaging procurement'),
      core('/industry/cosmetic-packaging-solutions.html', 'Cosmetic packaging solutions', 'industry', 'cosmetic packaging procurement'),
      core('/industry/coffee-tea-packaging-solutions.html', 'Coffee and tea packaging solutions', 'industry', 'coffee and tea packaging procurement')
    ],
    faq: [core('/faq.html', 'Buyer FAQ', 'faq', 'MOQ, quote, sample, shipping and OEM/ODM answers')],
    factoryCapability: [core('/factory-capability.html', 'Factory capability', 'trust-page', 'factory direct production capability')],
    qualityControl: [core('/quality-control.html', 'Quality control', 'trust-page', 'quality inspection and pre-shipment control')],
    sampleProcess: [core('/sample-process.html', 'Sample process', 'trust-page', 'custom packaging sampling workflow')],
    shipping: [core('/shipping.html', 'Shipping and lead time', 'trust-page', 'worldwide shipping and export delivery')],
    artworkGuidelines: [core('/artwork-guidelines.html', 'Artwork guidelines', 'trust-page', 'dieline, bleed, color and prepress requirements')],
    moqPolicy: [core('/moq-policy.html', 'MOQ policy', 'trust-page', 'MOQ 500 PCS policy for B2B packaging orders')],
    blogGuides: remoteBlog.map(item => ({ ...item, type: 'blog-guide', buyerIntent: 'B2B custom packaging guide and RFQ education' })),
    newsPages: remoteNews.map(item => ({ ...item, type: 'news-page', buyerIntent: 'custom packaging market and procurement update' }))
  };
}
export async function GET() {
  const raw = await readLocalIndex();
  const local = deepNormalizeHost(raw);
  const remoteProducts = await remoteItems('products');
  const remoteBlog = await remoteItems('blog');
  const remoteNews = await remoteItems('news');
  const payload = {
    ...local,
    version: 'v95-page-classifications',
    site: SITE_URL,
    contact: 'Linda Wang',
    email: 'linda@colorprintingpackage.com',
    whatsapp: '+86 181 6573 0353',
    moq: '500 PCS',
    businessModel: 'B2B custom packaging manufacturer, OEM/ODM, factory direct from Shenzhen. MOQ 500 PCS.',
    r2CmsEnabled: Boolean(contentBaseUrl()),
    r2CmsPolicy: 'New product/blog/news HTML may be uploaded to R2/CMS and served by exact URL through ISR without Git redeploy.',
    pageClassifications: classifiedPages(remoteProducts, remoteBlog, remoteNews),
    procurementAnswers: {
      moq: 'MOQ starts from 500 PCS for custom packaging.',
      quoteRequest: 'Send size, quantity, material, printing colors, finish, destination country and artwork file through contact.html, email or WhatsApp.',
      customSize: 'Custom size, custom structure and OEM/ODM packaging are supported.',
      buyerTypes: ['brand owner', 'importer', 'distributor', 'ecommerce seller', 'food brand', 'cosmetic brand', 'pharma buyer', 'gift packaging buyer']
    },
    remoteProducts,
    remoteBlog,
    remoteNews
  };
  return Response.json(payload, { headers: { 'Cache-Control': `s-maxage=${ISR_SECONDS}, stale-while-revalidate` } });
}
