import { NextResponse } from 'next/server';

const SITE_URL = 'https://www.packagingfactorydirect.com';

function withCasesHeaders(response) {
  response.headers.set('X-Robots-Tag', 'noindex, follow');
  response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  return response;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/cases' || pathname.startsWith('/cases/')) {
    return withCasesHeaders(NextResponse.redirect(new URL('/factory-capability.html', SITE_URL), 301));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cases', '/cases/:path*']
};
