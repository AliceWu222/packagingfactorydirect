import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

async function readJson() {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'ai-search-answer-cards.json');
  const text = await fs.readFile(file, 'utf8');
  return JSON.parse(text);
}

export async function GET() {
  const payload = await readJson();
  return Response.json(payload, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      'X-Robots-Tag': 'noindex, follow'
    }
  });
}
