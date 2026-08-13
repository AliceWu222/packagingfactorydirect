import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE_REF = process.env.PFD_BASE_REF || '9e34d12096a943a6991312f65fbb59622eea61d1';
const ROOT = process.cwd();
const AUTHORIZED_PROTECTED_FILES = new Set([
  'app/sitemap.xml/route.js',
  'assets/css/style.css',
  'news/r2-cms-isr-seo-packaging-publishing-trend.html'
]);
const APPENDED_BLOGS = [
  'blog/custom-packaging-landed-cost-dimensional-weight-moq-guide.html',
  'blog/packaging-color-matching-pantone-cmyk-delta-e-proof-guide.html',
  'blog/ecommerce-packaging-transit-test-ista-3a-mailer-box-guide.html',
  'blog/food-pouch-odor-migration-food-contact-document-checklist.html',
  'blog/custom-packaging-rfq-template-quote-comparison-guide.html'
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

if (productFiles.length !== 182) violations.push(`products: expected 182 HTML files, found ${productFiles.length}`);
if (blogFiles.length !== 43) violations.push(`blog: expected 43 HTML files, found ${blogFiles.length}`);
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
  desktopFourColumnRulePresent: true
}, null, 2));
