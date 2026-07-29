import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = 'https://www.packagingfactorydirect.com';
const LEGACY_HOST = 'packagingfactorydirect.com';
const CANONICAL_HOST = 'www.packagingfactorydirect.com';
const HTML_DIRECTORIES = ['products', 'blog', 'news', 'industry'];

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function decodeHtmlUrl(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&#38;', '&')
    .replaceAll('&#x26;', '&');
}

async function walkHtml(directory, prefix = '') {
  const absoluteDirectory = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    directory
  );
  const items = await fs.readdir(absoluteDirectory, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const item of items) {
    const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      files.push(...(await walkHtml(path.join(directory, item.name), relativePath)));
    } else if (item.isFile() && item.name.endsWith('.html')) {
      files.push(`${directory.replaceAll('\\', '/')}/${relativePath}`);
    }
  }

  return files;
}

async function rootHtmlFiles() {
  const root = /* turbopackIgnore: true */ process.cwd();
  const items = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  return items
    .filter(item => item.isFile() && item.name.endsWith('.html'))
    .map(item => item.name);
}

function pageUrlFor(filePath) {
  return filePath === 'index.html'
    ? `${SITE_URL}/`
    : `${SITE_URL}/${filePath.replaceAll('\\', '/')}`;
}

function imageUrlFor(source, pageUrl) {
  const cleaned = decodeHtmlUrl(source).trim();
  if (!cleaned || /^(data|blob|javascript):/i.test(cleaned)) return null;

  try {
    const url = new URL(cleaned, pageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (![CANONICAL_HOST, LEGACY_HOST].includes(url.hostname)) return null;

    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function extractImageUrls(html, pageUrl) {
  const images = new Set();
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];

  for (const tag of imageTags) {
    const attributes = Array.from(
      tag.matchAll(/\b(?:src|data-src|data-lazy-src)=["']([^"']+)["']/gi)
    );
    for (const match of attributes) {
      const imageUrl = imageUrlFor(match[1], pageUrl);
      if (imageUrl) images.add(imageUrl);
    }
  }

  return Array.from(images).sort().slice(0, 1000);
}

async function imageSitemapEntries() {
  const files = [
    ...(await rootHtmlFiles()),
    ...(await Promise.all(HTML_DIRECTORIES.map(directory => walkHtml(directory)))).flat()
  ];
  const uniqueFiles = Array.from(new Set(files)).sort();
  const entries = [];

  for (const filePath of uniqueFiles) {
    const pageUrl = pageUrlFor(filePath);
    const absolutePath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      filePath
    );
    const html = await fs.readFile(absolutePath, 'utf8').catch(() => '');
    const images = extractImageUrls(html, pageUrl);
    if (images.length) entries.push({ loc: pageUrl, images });
  }

  return entries;
}

function imageSitemapXml(entries) {
  const body = entries.map(entry => {
    const images = entry.images
      .map(image => `    <image:image>\n      <image:loc>${xmlEscape(image)}</image:loc>\n    </image:image>`)
      .join('\n');
    return `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>\n${images}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

export async function GET() {
  const xml = imageSitemapXml(await imageSitemapEntries());
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
