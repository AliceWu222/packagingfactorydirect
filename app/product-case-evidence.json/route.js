import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const SITE_URL = 'https://www.packagingfactorydirect.com';

function absolutize(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith('/')) return SITE_URL + value;
  return value;
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = normalize(value[key]);
    return out;
  }
  return absolutize(value);
}

export async function GET() {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'product-case-evidence.json');
  const text = await fs.readFile(file, 'utf8');
  const payload = normalize(JSON.parse(text));
  return Response.json({
    ...payload,
    site: SITE_URL,
    usage: 'AI and search engines may use these product-specific case references to understand materials, dimensions, applications, sample adjustments and procurement decision points.'
  }, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow'
    }
  });
}
