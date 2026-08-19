import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const ROOT = /*turbopackIgnore: true*/ process.cwd();
const ASSET_ROOT = path.resolve(/*turbopackIgnore: true*/ ROOT, 'assets');

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

export async function GET(request, { params }) {
  const p = params && typeof params.then === 'function' ? await params : params;
  const parts = p?.assetPath || [];
  const file = path.resolve(ASSET_ROOT, ...parts);
  if (!file.startsWith(ASSET_ROOT)) {
    return new Response('Invalid asset path', { status: 400 });
  }

  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    // CSS/JS carry a ?v= cache-busting version, so a 1-day browser cache is safe.
    // Images are recompressed periodically; a 1-day browser + 7-day edge cache
    // lets optimizations reach visitors quickly while keeping repeat visits fast.
    const cacheControl =
      ext === '.css' || ext === '.js'
        ? 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
        : 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
    return new Response(data, {
      headers: {
        'Content-Type': contentType(file),
        'Cache-Control': cacheControl
      }
    });
  } catch {
    return new Response('Asset not found', { status: 404 });
  }
}
