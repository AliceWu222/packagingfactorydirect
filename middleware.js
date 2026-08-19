import { NextResponse } from 'next/server';

// Multi-language <html lang>/dir fix at the edge so SSR HTML carries the
// correct language (and RTL for Arabic) without breaking static prerendering.
const LANGS = { '/de': 'de', '/fr': 'fr', '/es': 'es', '/ja': 'ja', '/ar': 'ar' };

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const first = '/' + (path.split('/')[1] || '');
  const lang = LANGS[first];
  if (!lang) return NextResponse.next();
  // Only rewrite HTML document responses.
  const response = NextResponse.next();
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return response;
  try {
    const text = await response.text();
    const dir = lang === 'ar' ? ' rtl' : '';
    const fixed = text
      .replace('<html lang="en">', `<html lang="${lang}" dir="${dir}">`)
      .replace('<html lang="en"', `<html lang="${lang}" dir="${dir}"`);
    const out = new NextResponse(fixed, { status: response.status, statusText: response.statusText, headers: response.headers });
    out.headers.set('Content-Type', 'text/html; charset=utf-8');
    out.headers.set('x-pfd-lang', lang);
    return out;
  } catch (e) {
    return response;
  }
}

export const config = {
  matcher: ['/de/:path*', '/fr/:path*', '/es/:path*', '/ja/:path*', '/ar/:path*']
};
