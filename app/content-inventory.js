import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = 'https://www.packagingfactorydirect.com';
const CONTENT_KINDS = new Set(['products', 'blog', 'news']);

function decodeEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function textOnly(value = '') {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeEntities(match[1].trim()) : '';
}

function metaContent(html, key, expected) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, key).toLowerCase() === expected.toLowerCase()) return attr(tag, 'content');
  }
  return '';
}

function firstImage(html, pageUrl) {
  const og = metaContent(html, 'property', 'og:image');
  const first = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  const raw = og || decodeEntities(first);
  if (!raw) return `${SITE_URL}/assets/img/hero/hero-1.webp`;
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return `${SITE_URL}/assets/img/hero/hero-1.webp`;
  }
}

export async function readLocalHtmlInventory(kind) {
  if (!CONTENT_KINDS.has(kind)) return [];
  const directory = path.join(/*turbopackIgnore: true*/ process.cwd(), kind);
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const output = [];

  for (const entry of entries.filter(item => item.isFile() && item.name.toLowerCase().endsWith('.html')).sort((a, b) => a.name.localeCompare(b.name))) {
    const html = await fs.readFile(path.join(directory, entry.name), 'utf8').catch(() => '');
    if (!html) continue;
    const url = `${SITE_URL}/${kind}/${entry.name}`;
    const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || entry.name.replace(/\.html$/i, '').replace(/-/g, ' ');
    const description = metaContent(html, 'name', 'description') || html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
    output.push({
      title: textOnly(rawTitle).replace(/\s*\|\s*Packaging Factory Direct\s*$/i, ''),
      url,
      description: textOnly(description),
      image: firstImage(html, url),
      category: kind === 'products' ? 'OEM & Customize' : kind === 'blog' ? 'B2B Packaging Guide' : 'Packaging Industry News',
      source: 'local-html'
    });
  }
  return output;
}

export function mergeByUrl(...groups) {
  const byUrl = new Map();
  for (const group of groups) {
    for (const item of group || []) {
      if (!item?.url) continue;
      if (!byUrl.has(item.url)) byUrl.set(item.url, item);
      else byUrl.set(item.url, { ...byUrl.get(item.url), ...item });
    }
  }
  return Array.from(byUrl.values());
}
