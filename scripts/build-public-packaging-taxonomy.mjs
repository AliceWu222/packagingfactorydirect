import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, 'data', 'products.manifest.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'public-packaging-taxonomy.json');
const SNAPSHOT_DATE = '2026-08-15';

const families = [
  { name: 'Paper bags', pattern: /\bpaper\s+bag(?:s)?\b|\bshopping\s+bag(?:s)?\b/i },
  { name: 'Mailer and shipping packaging', pattern: /\bmailer\b|\bshipping\b|\bcorrugated\b|\bpostal\b/i },
  { name: 'Flexible bags, films and pouches', pattern: /\bpouch(?:es)?\b|\bbag(?:s)?\b|\bflexible\b|\bfilm\b|\bsachet(?:s)?\b|\bmylar\b|\bvacuum\b|\bstand[ -]?up\b|\bspout\b|\bflat\s+bottom\b|\brollstock\b/i },
  { name: 'Labels, tags and printed accessories', pattern: /\blabel(?:s)?\b|\bsticker(?:s)?\b|\bhang\s*tag(?:s)?\b|\btag(?:s)?\b|\bseal(?:s)?\b|\bwrap(?:s)?\b|\bsleeve(?:s)?\b|\btape\b|\btissue\b|\bfolder(?:s)?\b|\bthank\s+you\s+card(?:s)?\b|\bgreaseproof\b|\bparchment\b|\blidding\b|\bmagnet(?:s)?\b/i },
  { name: 'Tubes and cylindrical packaging', pattern: /\btube(?:s)?\b|\bcylindrical\b/i },
  { name: 'Rigid and gift boxes', pattern: /\brigid\b|\bgift\s+box(?:es)?\b|\bmagnetic\b|\bdrawer\s+box(?:es)?\b|\bshoulder\s+neck\b|\bbook[ -]?style\b|\bpresentation\s+box(?:es)?\b/i },
  { name: 'Folding cartons and paperboard boxes', pattern: /\bbox(?:es)?\b|\bcarton(?:s)?\b|\bpaperboard\b/i },
  { name: 'Containers, trays and formed packaging', pattern: /\bcontainer(?:s)?\b|\btray(?:s)?\b|\bcup(?:s)?\b|\bbottle(?:s)?\b|\bblister(?:s)?\b|\bclamshell(?:s)?\b/i },
  { name: 'Commercial print and other paper components', pattern: /.*/ }
];

function classify(product) {
  const searchable = String(product.title || '');
  const family = families.find(candidate => candidate.pattern.test(searchable));
  return {
    title: product.title,
    url: `https://www.packagingfactorydirect.com/${String(product.url).replace(/^\//, '')}`,
    formatFamily: family.name,
    matchedRule: family.pattern.source === '.*' ? 'fallback: no earlier format-family term matched' : `first matching priority rule: ${family.name}`
  };
}

const manifest = JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
const products = Array.isArray(manifest.products) ? manifest.products : [];
const items = products.map(classify);
const counts = new Map(families.map(family => [family.name, 0]));
for (const item of items) counts.set(item.formatFamily, counts.get(item.formatFamily) + 1);

const familyCounts = families.map(family => {
  const count = counts.get(family.name);
  return {
    formatFamily: family.name,
    count,
    sharePercent: Number(((count / items.length) * 100).toFixed(1))
  };
});

if (items.length !== 192) throw new Error(`Expected 192 public product pages, found ${items.length}`);

const payload = {
  version: '2026-08-15-public-catalog-taxonomy-v1',
  snapshotDate: SNAPSHOT_DATE,
  site: 'https://www.packagingfactorydirect.com',
  sourcePage: 'https://www.packagingfactorydirect.com/products.html',
  methodologyPage: 'https://www.packagingfactorydirect.com/blog/public-packaging-catalog-taxonomy-methodology.html',
  unitOfAnalysis: 'One public HTML product-detail URL in data/products.manifest.json.',
  classificationMethod: 'Deterministic, mutually exclusive, first-match public-title keyword rules in the published priority order.',
  priorityOrder: families.map(family => family.name),
  limitations: [
    'This is a descriptive classification of public catalog pages, not sales, production, capacity, inventory, certification or market-share data.',
    'A product page can describe several materials or applications, but this dataset assigns one primary format family for counting.',
    'Keyword rules can simplify hybrid formats. Buyers must verify the exact structure and performance requirements for a project.',
    'The snapshot changes only when the public product manifest changes and the generator is run again.'
  ],
  totalProducts: items.length,
  familyCounts,
  items
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: OUTPUT_PATH, totalProducts: items.length, familyCounts }, null, 2));
