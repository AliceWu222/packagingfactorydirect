import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const ROOT = process.cwd();
const ASSET_ROOT = path.resolve(ROOT, 'assets');

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
    return new Response(data, {
      headers: {
        'Content-Type': contentType(file),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('Asset not found', { status: 404 });
  }
}
