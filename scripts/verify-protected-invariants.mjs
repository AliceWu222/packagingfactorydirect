import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE_REF = process.env.PFD_BASE_REF || '29d4e69';
const ROOT = process.cwd();
const NEW_BLOGS = new Set([
  'blog/dermal-filler-secondary-packaging-rfq-guide.html',
  'blog/beauty-pr-kit-packaging-specification-guide.html',
  'blog/flexible-pouch-barrier-otr-wvtr-rfq-guide.html',
  'blog/china-custom-packaging-supplier-audit-evidence-checklist.html'
]);

function git(args, encoding = 'utf8') {
  return execFileSync('git', ['-c', `safe.directory=${ROOT.replaceAll('\\', '/')}`, ...args], {
    cwd: ROOT,
    encoding,
    maxBuffer: 32 * 1024 * 1024
  });
}

function trackedAtBase() {
  return git(['ls-tree', '-r', '--name-only', BASE_REF])
    .split(/\r?\n/)
    .filter(Boolean);
}

function isProtected(file) {
  if (['index.html', 'products.html', 'blog.html', 'news.html', 'contact.html', 'robots.txt', 'sitemap.xml'].includes(file)) return true;
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

if (productFiles.length !== 182) violations.push(`products: expected 182 HTML files, found ${productFiles.length}`);
if (blogFiles.length !== 38) violations.push(`blog: expected 38 HTML files, found ${blogFiles.length}`);
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
  desktopFourColumnRulePresent: true
}, null, 2));
