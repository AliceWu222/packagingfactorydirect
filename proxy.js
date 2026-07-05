import { NextResponse } from 'next/server';

const SITE_URL = 'https://www.packagingfactorydirect.com';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/cases' || pathname.startsWith('/cases/')) {
    return NextResponse.redirect(new URL('/factory-capability.html', SITE_URL), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cases', '/cases/:path*']
};
