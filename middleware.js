import { NextResponse } from 'next/server';

// Multi-language <html lang>/dir fix at the edge so SSR HTML carries the
// correct language (and RTL for Arabic).
const LANGS = { '/de': 'de', '/fr': 'fr', '/es': 'es', '/ja': 'ja', '/ar': 'ar' };

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const first = '/' + (path.split('/')[1] || '');
  const lang = LANGS[first];
  if (!lang) return NextResponse.next();
  const response = NextResponse.next();
  // Mark the request for debugging even if the body rewrite fails.
  response.headers.set('x-pfd-lang', lang);
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return response;
  try {
    const text = await response.text();
    if (text && text.includes('<html')) {
      const dir = lang === 'ar' ? ' rtl' : '';
      const fixed = text
        .replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`)
        .replace('<html lang="en"', `<html lang="${lang}" dir="${dir}"`);
      if (fixed !== text) {
        const out = new NextResponse(fixed, { status: response.status, statusText: response.statusText, headers: response.headers });
        out.headers.set('Content-Type', 'text/html; charset=utf-8');
        return out;
      }
    }
  } catch (e) {
    // keep original response on any read/parse error
  }
  return response;
}

export const config = {
  matcher: ['/de/:path*', '/fr/:path*', '/es/:path*', '/ja/:path*', '/ar/:path*']
};
