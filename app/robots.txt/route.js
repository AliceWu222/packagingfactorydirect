import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const text = await fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), 'robots.txt'), 'utf8').catch(() => 'User-agent: *\nAllow: /\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
