import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const text = await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), 'llms.txt'), 'utf8').catch(() => '# Packaging Factory Direct\n');
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
  return new Response(text + addendum, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
