import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const source = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'public-packaging-taxonomy.json'), 'utf8'));
  return Response.json({
    ...source,
    generatedAt: new Date().toISOString(),
    contentPolicy: 'Public catalog observations only. See methodologyPage and limitations before reuse.'
  }, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow'
    }
  });
}
