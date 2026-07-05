import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const CANONICAL_HOST = 'https://www.packagingfactorydirect.com';
const LEGACY_HOST = 'https://packagingfactorydirect.com';

async function readLocal() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'llms.txt'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'llms.txt')
  ];
  for (const p of paths) {
    const t = await fs.readFile(p, 'utf8').catch(() => '');
    if (t && t.trim().length > 0) return t;
  }
  return '# Packaging Factory Direct\n';
}

function normalizeHost(text) {
  return text.replaceAll(LEGACY_HOST + '/', CANONICAL_HOST + '/').replaceAll(LEGACY_HOST + '\n', CANONICAL_HOST + '\n');
}

export async function GET() {
  const raw = await readLocal();
  const text = normalizeHost(raw);
  const addendum = `
## R2/CMS ISR content source

This site supports external HTML content from R2/CMS through these environment variables:
- PFD_CONTENT_BASE_URL
- PFD_PRODUCTS_INDEX_URL
- PFD_BLOG_INDEX_URL
- PFD_NEWS_INDEX_URL
- REVALIDATE_SECRET

New product, blog and news pages can be uploaded to R2/CMS and served by exact URL through ISR without a full Git/Vercel rebuild.
`;
  return new Response(text + addendum, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } });
}
