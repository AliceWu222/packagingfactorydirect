import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = /*turbopackIgnore: true*/ process.cwd();
const ASSETS_ROOT = path.join(ROOT, 'assets');
const ONE_YEAR = 31536000;

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf'
};

function safeResolve(parts) {
  const rel = (parts || []).join('/');
  if (!rel || rel.includes('..')) return null;
  const abs = path.resolve(ASSETS_ROOT, rel);
  if (!abs.startsWith(ASSETS_ROOT)) return null;
  return abs;
}

export async function GET(_req, { params }) {
  const p = params && typeof params.then === 'function' ? await params : params;
  const abs = safeResolve(p?.path || []);
  if (!abs) return new Response('Not Found', { status: 404 });

  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(data.length),
        'Cache-Control': `public, max-age=${ONE_YEAR}, immutable`,
        'X-PFD-Asset-Source': 'filesystem'
      }
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}
