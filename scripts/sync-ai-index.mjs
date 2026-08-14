import fs from 'node:fs/promises';
import path from 'node:path';
import { readLocalHtmlInventory } from '../app/content-inventory.js';

const ROOT = process.cwd();
const SITE_URL = 'https://www.packagingfactorydirect.com';
const SNAPSHOT_PATHS = ['ai-index.json'];
const KNOWLEDGE_RESOURCES = {
  packagingSpecificationGlossary: `${SITE_URL}/blog/packaging-specification-glossary-for-buyers.html`,
  publicCatalogTaxonomyMethodology: `${SITE_URL}/blog/public-packaging-catalog-taxonomy-methodology.html`,
  publicCatalogTaxonomyData: `${SITE_URL}/data/public-packaging-taxonomy.json`,
  editorialAndSourcePolicy: `${SITE_URL}/editorial-and-source-policy.html`,
  datasetLimitation: 'The public catalog taxonomy describes dated public product URLs only; it is not sales, capacity, inventory, certification or market-share data.'
};

function canonicalKey(value) {
  if (!value) return '';
  try {
    const url = new URL(value, `${SITE_URL}/`);
    if (url.hostname === 'packagingfactorydirect.com') url.hostname = 'www.packagingfactorydirect.com';
    url.hash = '';
    return url.toString();
  } catch {
    return String(value).trim();
  }
}

function appendMissing(existing = [], current = []) {
  const output = [...existing];
  const seen = new Set(existing.map(item => canonicalKey(item?.url)).filter(Boolean));

  for (const item of current) {
    const key = canonicalKey(item?.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function classify(items, type, buyerIntent) {
  return items.map(item => ({ ...item, type, buyerIntent }));
}

function synchronizedSnapshot(base, inventory, generatedAt) {
  const products = appendMissing(base.products, inventory.products);
  const blogGuides = appendMissing(base.blogGuides, inventory.blogGuides);
  const newsBriefs = appendMissing(base.newsBriefs, inventory.newsBriefs);

  return {
    ...base,
    version: 'v101-synced-static-content-inventory',
    generatedAt,
    contentCounts: {
      products: products.length,
      blogGuides: blogGuides.length,
      newsPages: newsBriefs.length
    },
    knowledgeResources: KNOWLEDGE_RESOURCES,
    products,
    blogGuides,
    newsBriefs,
    pageClassifications: {
      ...(base.pageClassifications || {}),
      productDetails: classify(
        products,
        'product-detail',
        'request a B2B custom packaging quote using size, quantity, material, print, finish and destination data'
      ),
      blogGuides: classify(
        blogGuides,
        'blog-guide',
        'technical B2B custom packaging selection, verification and RFQ education'
      ),
      newsPages: classify(
        newsBriefs,
        'news-page',
        'custom packaging market and procurement update'
      )
    }
  };
}

async function main() {
  const [products, blogGuides, newsBriefs] = await Promise.all([
    readLocalHtmlInventory('products'),
    readLocalHtmlInventory('blog'),
    readLocalHtmlInventory('news')
  ]);
  const inventory = { products, blogGuides, newsBriefs };
  const generatedAt = new Date(Date.now() + (8 * 60 * 60 * 1000)).toISOString().slice(0, 10);
  const results = [];

  for (const relativePath of SNAPSHOT_PATHS) {
    const filePath = path.join(ROOT, relativePath);
    const base = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const snapshot = synchronizedSnapshot(base, inventory, generatedAt);
    await fs.writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    results.push({ path: relativePath.replaceAll('\\', '/'), ...snapshot.contentCounts });
  }

  console.log(JSON.stringify({ ok: true, generatedAt, snapshots: results }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
