import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const CANONICAL_HOST = 'https://www.packagingfactorydirect.com';
const LEGACY_HOST = 'https://packagingfactorydirect.com';

async function readLocal() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'robots.txt'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'robots.txt')
  ];
  for (const p of paths) {
    const t = await fs.readFile(p, 'utf8').catch(() => '');
    if (t && t.trim().length > 0) return t;
  }
  return 'User-agent: *\nAllow: /\nAllow: /llms.txt\nAllow: /ai-index.json\nAllow: /product-feed.json\nAllow: /data/ai-search-answer-cards.json\nAllow: /data/seo-geo-keyword-map.json\nSitemap: https://www.packagingfactorydirect.com/sitemap.xml\n';
}

function normalizeHost(text) {
  return text.replaceAll(LEGACY_HOST + '/', CANONICAL_HOST + '/').replaceAll(LEGACY_HOST + '\n', CANONICAL_HOST + '\n');
}

export async function GET() {
  const raw = await readLocal();
  const text = normalizeHost(raw);
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } });
}
