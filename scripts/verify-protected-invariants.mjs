import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE_REF = process.env.PFD_BASE_REF || '9e34d12096a943a6991312f65fbb59622eea61d1';
const ROOT = process.cwd();
const AUTHORIZED_PROTECTED_FILES = new Set([
  'app/sitemap.xml/route.js',
  'assets/css/style.css',
  'news/r2-cms-isr-seo-packaging-publishing-trend.html',
  'products.html'
]);
const APPENDED_PRODUCTS = [
  'products/custom-perfume-gift-box-insert-fragrance-sets.html',
  'products/custom-six-candle-gift-box-aromatherapy-discovery-sets.html',
  'products/custom-candle-reed-diffuser-gift-box-satin-insert.html',
  'products/custom-candle-care-set-gift-box-fitted-tool-insert.html',
  'products/custom-candle-diffuser-gift-box-paperboard-insert.html',
  'products/custom-home-fragrance-gift-box-room-spray-candle.html',
  'products/custom-pink-corrugated-mailer-box-beauty-subscriptions.html',
  'products/custom-beauty-product-mailer-box-matching-paper-bag.html',
  'products/custom-ribbon-closure-rigid-gift-box-jewelry.html',
  'products/custom-floral-embossed-hang-tags-bridal-boutiques.html'
];
const PRODUCT_APPEND_BEGIN = '<!-- BEGIN 2026-08-14 CUSTOM PACKAGING PRODUCT APPEND -->';
const PRODUCT_APPEND_END = '<!-- END 2026-08-14 CUSTOM PACKAGING PRODUCT APPEND -->';
const FEED_APPEND_URLS = [
  'products/custom-magnetic-gift-box-gold-foil-logo.html',
  'products/custom-pink-magnetic-jewelry-gift-box-set-gold-foil-thank-you-card-drawstring-pouch.html',
  ...APPENDED_PRODUCTS
];
const APPENDED_BLOGS = [
  'blog/custom-packaging-landed-cost-dimensional-weight-moq-guide.html',
  'blog/packaging-color-matching-pantone-cmyk-delta-e-proof-guide.html',
  'blog/ecommerce-packaging-transit-test-ista-3a-mailer-box-guide.html',
  'blog/food-pouch-odor-migration-food-contact-document-checklist.html',
  'blog/custom-packaging-rfq-template-quote-comparison-guide.html',
  'blog/how-to-measure-product-for-custom-box.html',
  'blog/gsm-vs-pt-mm-packaging-paperboard-guide.html'
];
const NEW_BLOGS = new Set([
  'blog/dermal-filler-secondary-packaging-rfq-guide.html',
  'blog/beauty-pr-kit-packaging-specification-guide.html',
  'blog/flexible-pouch-barrier-otr-wvtr-rfq-guide.html',
  'blog/china-custom-packaging-supplier-audit-evidence-checklist.html',
  ...APPENDED_BLOGS
]);
const BLOG_APPEND_BEGIN = '<!-- BEGIN 2026-08-10 FORUM PAIN-POINT GUIDES -->';
const BLOG_APPEND_END = '<!-- END 2026-08-10 FORUM PAIN-POINT GUIDES -->';

function git(args, encoding = 'utf8') {
  return execFileSync('git', ['-c', `safe.directory=${ROOT.replaceAll('\\', '/')}`, ...args], {
    cwd: ROOT,
    encoding,
    maxBuffer: 32 * 1024 * 1024
  });
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function trackedAtBase() {
  return git(['ls-tree', '-r', '--name-only', BASE_REF])
    .split(/\r?\n/)
    .filter(Boolean);
}

function isProtected(file) {
  if (AUTHORIZED_PROTECTED_FILES.has(file)) return false;
  if (['index.html', 'products.html', 'news.html', 'contact.html', 'robots.txt', 'sitemap.xml'].includes(file)) return true;
  if (/^app\/(?:robots\.txt|sitemap(?:-[^/]+)?\.xml)\/route\.js$/.test(file)) return true;
  if (file.startsWith('products/')) return true;
  if (file.startsWith('news/')) return true;
  if (file.startsWith('assets/')) return true;
  if (file.startsWith('blog/') && !NEW_BLOGS.has(file)) return true;
  return false;
}

const violations = [];
const baseFiles = trackedAtBase();
const changedFiles = new Set(
  git(['diff', '--name-only', BASE_REF, '--'])
    .split(/\r?\n/)
    .filter(Boolean)
);
for (const file of baseFiles.filter(isProtected)) {
  const localPath = path.join(ROOT, ...file.split('/'));
  if (!existsSync(localPath)) {
    violations.push(`${file}: deleted`);
    continue;
  }
  if (changedFiles.has(file)) violations.push(`${file}: content changed`);
}

const baseNewsLinkPage = git(['show', `${BASE_REF}:news/r2-cms-isr-seo-packaging-publishing-trend.html`]);
const currentNewsLinkPage = readFileSync(path.join(ROOT, 'news', 'r2-cms-isr-seo-packaging-publishing-trend.html'), 'utf8');
const expectedNewsLinkPage = baseNewsLinkPage.replace(
  '<a href="../R2_CMS_ISR_SETUP.md">R2/CMS ISR Setup</a>',
  '<a href="../factory-capability.html">Factory Capability</a>'
);
if (normalizeLineEndings(currentNewsLinkPage).replace(/\n$/, '') !== normalizeLineEndings(expectedNewsLinkPage).replace(/\n$/, '')) {
  violations.push('news/r2-cms-isr-seo-packaging-publishing-trend.html: changes exceed the authorized broken-link replacement');
}

const currentLegacySitemapRoute = readFileSync(path.join(ROOT, 'app', 'sitemap.xml', 'route.js'), 'utf8');
if (!currentLegacySitemapRoute.includes("status: 308") || !currentLegacySitemapRoute.includes('sitemap-index.xml')) {
  violations.push('app/sitemap.xml/route.js: legacy sitemap must redirect to sitemap-index.xml');
}
const nextConfig = readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf8');
if (!nextConfig.includes("{ source: '/sitemap.xml', destination: '/sitemap-index.xml', permanent: true }")) {
  violations.push('next.config.mjs: legacy sitemap redirect must precede the static public file');
}
const publicRobots = readFileSync(path.join(ROOT, 'public', 'robots.txt'), 'utf8');
const publicRobotSitemaps = [...publicRobots.matchAll(/^Sitemap:\s*(\S+)/gmi)].map(match => match[1]);
if (JSON.stringify(publicRobotSitemaps) !== JSON.stringify(['https://www.packagingfactorydirect.com/sitemap-index.xml'])) {
  violations.push(`public/robots.txt: expected only the sitemap index, found ${publicRobotSitemaps.join(', ')}`);
}

const baseCss = git(['show', `${BASE_REF}:assets/css/style.css`]);
const currentCssForAuthorization = readFileSync(path.join(ROOT, 'assets', 'css', 'style.css'), 'utf8');
const cssInsertionMarker = `.products-page .page-hero{\n  padding:34px 0 22px !important;\n}\n`;
const authorizedCssBlock = `\n/* 2026-08-13 render-cost optimization: preserve every card and the approved grid,\n   while allowing browsers to skip painting cards far below the viewport. */\n@supports (content-visibility:auto){\n  .filters ~ .grid > .product-card:nth-child(n+13){\n    content-visibility:auto;\n    contain-intrinsic-size:auto 470px;\n  }\n}\n`;
const normalizedBaseCss = normalizeLineEndings(baseCss);
const expectedCss = normalizedBaseCss.replace(cssInsertionMarker, `${cssInsertionMarker}${authorizedCssBlock}`);
if (normalizeLineEndings(currentCssForAuthorization) !== expectedCss) {
  violations.push('assets/css/style.css: changes exceed the authorized content-visibility block');
}

const pageRuntime = readFileSync(path.join(ROOT, 'app', '[[...path]]', 'page.jsx'), 'utf8');
for (const required of [
  "'@type': 'Product'",
  'productAndRfqServiceJsonLd',
  'appendedProductFaqJsonLd',
  'APPENDED_PRODUCT_FAQ_PATHS',
  'additionalProperty',
  'seoTitleForRel',
  'seoDescriptionForRel',
  'articleDatesFromHtml',
  'SOURCE_CONTROLLED_ARTICLE_DATES',
  'compactProductSearchAttributes',
  'repairVisibleMojibake',
  'contain-intrinsic-size:auto 470px'
]) {
  if (!pageRuntime.includes(required)) violations.push(`app/[[...path]]/page.jsx: missing ${required}`);
}

const baseBlog = git(['show', `${BASE_REF}:blog.html`]);
const currentBlog = readFileSync(path.join(ROOT, 'blog.html'), 'utf8');
const appendPattern = new RegExp(`${BLOG_APPEND_BEGIN}[\\s\\S]*?${BLOG_APPEND_END}`, 'g');
const appendMatches = currentBlog.match(appendPattern) || [];
if (appendMatches.length !== 1) {
  violations.push(`blog.html: expected one marked append-only block, found ${appendMatches.length}`);
} else {
  const blogWithoutAppend = currentBlog.replace(appendPattern, '');
  const baseBlogWithoutAppend = baseBlog.replace(appendPattern, '');
  if (normalizeLineEndings(blogWithoutAppend).replace(/\n$/, '') !== normalizeLineEndings(baseBlogWithoutAppend).replace(/\n$/, '')) {
    violations.push('blog.html: content outside the marked append-only block changed');
  }
  const appendedHrefs = [...appendMatches[0].matchAll(/href="(blog\/[^"]+\.html)"/g)].map(match => match[1]);
  if (JSON.stringify(appendedHrefs) !== JSON.stringify(APPENDED_BLOGS)) {
    violations.push(`blog.html: appended card order or URLs changed (${appendedHrefs.join(', ')})`);
  }
  if (!currentBlog.includes(`${BLOG_APPEND_END}</div></section><div class="floating">`)) {
    violations.push('blog.html: append-only block is not at the end of the existing card grid');
  }
}

const baseProducts = git(['show', `${BASE_REF}:products.html`], null);
const currentProducts = readFileSync(path.join(ROOT, 'products.html'));
const productBegin = Buffer.from(PRODUCT_APPEND_BEGIN);
const productEnd = Buffer.from(PRODUCT_APPEND_END);
const productBeginAt = currentProducts.indexOf(productBegin);
const secondProductBeginAt = productBeginAt < 0 ? -1 : currentProducts.indexOf(productBegin, productBeginAt + 1);
const productEndAt = currentProducts.indexOf(productEnd);
if (productBeginAt < 0 || productEndAt < productBeginAt || secondProductBeginAt >= 0) {
  violations.push('products.html: expected exactly one marked append-only product block');
} else {
  let removeStart = productBeginAt;
  if (removeStart > 1 && currentProducts[removeStart - 2] === 0x0d && currentProducts[removeStart - 1] === 0x0a) removeStart -= 2;
  else if (removeStart > 0 && currentProducts[removeStart - 1] === 0x0a) removeStart -= 1;
  let removeEnd = productEndAt + productEnd.length;
  if (currentProducts[removeEnd] === 0x0d && currentProducts[removeEnd + 1] === 0x0a) removeEnd += 2;
  else if (currentProducts[removeEnd] === 0x0a) removeEnd += 1;
  const productsWithoutAppend = Buffer.concat([
    currentProducts.subarray(0, removeStart),
    currentProducts.subarray(removeEnd)
  ]);
  const normalizedProductsWithoutAppend = normalizeLineEndings(productsWithoutAppend.toString('latin1'));
  const normalizedBaseProducts = normalizeLineEndings(baseProducts.toString('latin1'));
  if (normalizedProductsWithoutAppend !== normalizedBaseProducts) {
    violations.push('products.html: bytes outside the marked append-only block changed');
  }
  const productBlock = currentProducts.subarray(productBeginAt, productEndAt + productEnd.length).toString('utf8');
  const appendedProductHrefs = [...productBlock.matchAll(/href="(products\/[^"]+\.html)"/g)].map(match => match[1]);
  if (JSON.stringify(appendedProductHrefs) !== JSON.stringify(APPENDED_PRODUCTS)) {
    violations.push(`products.html: appended card order or URLs changed (${appendedProductHrefs.join(', ')})`);
  }
  const afterAppend = currentProducts.subarray(removeEnd, removeEnd + 96).toString('ascii').replace(/^\r?\n/, '');
  if (!afterAppend.startsWith('</div></div></section><section class="buyer-solution-hubs section"')) {
    violations.push('products.html: append-only block is not at the end of the existing product grid');
  }
}

const productFiles = readdirSync(path.join(ROOT, 'products')).filter(name => name.endsWith('.html'));
const blogFiles = readdirSync(path.join(ROOT, 'blog')).filter(name => name.endsWith('.html'));
const newsFiles = readdirSync(path.join(ROOT, 'news')).filter(name => name.endsWith('.html'));

const css = readFileSync(path.join(ROOT, 'assets', 'css', 'style.css'), 'utf8');
if (!/grid-template-columns\s*:\s*repeat\(4\s*,/i.test(css)) {
  violations.push('assets/css/style.css: no desktop four-column grid rule found');
}

for (const file of NEW_BLOGS) {
  if (!existsSync(path.join(ROOT, ...file.split('/')))) violations.push(`${file}: missing`);
}

for (const file of APPENDED_PRODUCTS) {
  const localPath = path.join(ROOT, ...file.split('/'));
  if (!existsSync(localPath)) {
    violations.push(`${file}: missing`);
    continue;
  }
  const html = readFileSync(localPath, 'utf8');
  const slug = path.basename(file, '.html');
  const image = path.join(ROOT, 'assets', 'img', 'products', `${slug}-1.webp`);
  if (!existsSync(image)) violations.push(`${file}: product image missing`);
  if (!html.includes(`https://www.packagingfactorydirect.com/${file}`)) violations.push(`${file}: self canonical missing`);
  if (!html.includes('FAQPage') || !html.includes('BreadcrumbList')) violations.push(`${file}: FAQ or breadcrumb schema missing`);
  if (/"@type"\s*:\s*"(?:Offer|AggregateRating|Review)"/.test(html)) violations.push(`${file}: contains prohibited commercial or review schema`);
  if (!html.includes('Packaging Only')) violations.push(`${file}: packaging-only scope is unclear`);
}

for (const file of [
  'packaging-rfq-builder.html',
  'public/downloads/custom-packaging-rfq-template.csv'
]) {
  if (!existsSync(path.join(ROOT, ...file.split('/')))) violations.push(`${file}: missing`);
}

const answerCards = readFileSync(path.join(ROOT, 'data', 'ai-search-answer-cards.json'), 'utf8');
if (answerCards.includes('/R2_CMS_ISR_SETUP.md')) {
  violations.push('data/ai-search-answer-cards.json: contains the retired internal deployment-document URL');
}

const basePublicFeed = JSON.parse(git(['show', `${BASE_REF}:public/product-feed.json`]));
const currentPublicFeed = JSON.parse(readFileSync(path.join(ROOT, 'public', 'product-feed.json'), 'utf8'));
const baseManifest = JSON.parse(git(['show', `${BASE_REF}:data/products.manifest.json`]));
const currentManifest = JSON.parse(readFileSync(path.join(ROOT, 'data', 'products.manifest.json'), 'utf8'));
for (const [label, baseFeed, currentFeed] of [
  ['public/product-feed.json', basePublicFeed, currentPublicFeed],
  ['data/products.manifest.json', baseManifest, currentManifest]
]) {
  const baseItems = baseFeed.products || [];
  const currentItems = currentFeed.products || [];
  if (JSON.stringify(currentItems.slice(0, baseItems.length)) !== JSON.stringify(baseItems)) {
    violations.push(`${label}: existing feed products changed or moved`);
  }
  const appendedUrls = currentItems.slice(baseItems.length).map(item => item.url);
  if (JSON.stringify(appendedUrls) !== JSON.stringify(FEED_APPEND_URLS)) {
    violations.push(`${label}: appended URLs or order changed (${appendedUrls.join(', ')})`);
  }
  if (currentItems.length !== 192) violations.push(`${label}: expected 192 products, found ${currentItems.length}`);
}
if (JSON.stringify(currentPublicFeed.products.slice(-FEED_APPEND_URLS.length)) !== JSON.stringify(currentManifest.products.slice(-FEED_APPEND_URLS.length))) {
  violations.push('newly appended static feed items and manifest items are inconsistent');
}

for (const relativePath of ['ai-index.json']) {
  const aiIndex = JSON.parse(readFileSync(path.join(ROOT, ...relativePath.split('/')), 'utf8'));
  const counts = {
    products: (aiIndex.products || []).length,
    blogGuides: (aiIndex.blogGuides || []).length,
    newsPages: (aiIndex.newsBriefs || []).length
  };
  if (counts.products !== 192 || counts.blogGuides !== 45 || counts.newsPages !== 18) {
    violations.push(`${relativePath}: stale content inventory ${JSON.stringify(counts)}`);
  }
  if (JSON.stringify(aiIndex.contentCounts) !== JSON.stringify(counts)) {
    violations.push(`${relativePath}: contentCounts do not match inventory arrays`);
  }
  const classified = aiIndex.pageClassifications || {};
  if ((classified.productDetails || []).length !== 192 || (classified.blogGuides || []).length !== 45 || (classified.newsPages || []).length !== 18) {
    violations.push(`${relativePath}: stale page classifications`);
  }
  if (!aiIndex.generatedAt || Number.isNaN(Date.parse(aiIndex.generatedAt)) || Date.parse(aiIndex.generatedAt) < Date.parse('2026-08-14T00:00:00Z')) {
    violations.push(`${relativePath}: generatedAt is missing or stale`);
  }
}

if (existsSync(path.join(ROOT, 'public', 'ai-index.json'))) {
  violations.push('public/ai-index.json: obsolete static shadow must be absent');
}
if (existsSync(path.join(ROOT, 'public', 'llms.txt'))) {
  violations.push('public/llms.txt: obsolete static shadow must be absent');
}
if (!existsSync(path.join(ROOT, 'data', 'llms-source.txt'))) {
  violations.push('data/llms-source.txt: buyer-facing LLM source is missing');
}

const aiIndexRoute = readFileSync(path.join(ROOT, 'app', 'ai-index.json', 'route.js'), 'utf8');
for (const required of [
  "version: 'v101-live-content-inventory'",
  'const generatedAt = new Date().toISOString()',
  'snapshotGeneratedAt: local.generatedAt || null',
  'contentCounts:'
]) {
  if (!aiIndexRoute.includes(required)) violations.push(`app/ai-index.json/route.js: missing ${required}`);
}
if (aiIndexRoute.includes("'public', 'ai-index.json'")) {
  violations.push('app/ai-index.json/route.js: still reads the route-shadowing public snapshot');
}
const llmsRoute = readFileSync(path.join(ROOT, 'app', 'llms.txt', 'route.js'), 'utf8');
if (!llmsRoute.includes("'data', 'llms-source.txt'") || llmsRoute.includes("'public', 'llms.txt'")) {
  violations.push('app/llms.txt/route.js: must read the non-public buyer-facing source only');
}
if (!existsSync(path.join(ROOT, 'scripts', 'sync-ai-index.mjs'))) {
  violations.push('scripts/sync-ai-index.mjs: missing');
}

if (productFiles.length !== 192) violations.push(`products: expected 192 HTML files, found ${productFiles.length}`);
if (blogFiles.length !== 45) violations.push(`blog: expected 45 HTML files, found ${blogFiles.length}`);
if (newsFiles.length !== 18) violations.push(`news: expected 18 HTML files, found ${newsFiles.length}`);

if (violations.length) {
  console.error('Protected invariant verification failed:');
  violations.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  baseRef: BASE_REF,
  productHtmlFiles: productFiles.length,
  blogHtmlFiles: blogFiles.length,
  newsHtmlFiles: newsFiles.length,
  protectedFilesChanged: 0,
  blogListingAppendOnly: true,
  productListingAppendOnly: true,
  staticProductFeedItems: currentPublicFeed.products.length,
  staticAiIndexItems: { products: 192, blogGuides: 45, newsPages: 18 },
  desktopFourColumnRulePresent: true
}, null, 2));
