const ONE_YEAR = 31536000;

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' }
];
const HTML_CACHE_HEADERS = [
  ...SECURITY_HEADERS,
  { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
];

const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: ONE_YEAR
  },
  outputFileTracingIncludes: {
    '/*': ['./*.html', './products/**/*.html', './blog/**/*.html', './news/**/*.html', './industry/**/*.html', './cases/**/*.html', './assets/**/*', './data/**/*', './*.xml', './*.txt', './*.json', './*.md']
  },
  async rewrites() {
    return [
      { source: '/assets/:path*', destination: '/api/assets/:path*' }
    ];
  },
  async redirects() {
    return [];
  },
  async headers() {
    return [
      // Homepage and major listing pages: keep browsers fresh while giving the CDN a longer ISR window.
      {
        source: '/',
        headers: HTML_CACHE_HEADERS
      },
      {
        source: '/products.html',
        headers: HTML_CACHE_HEADERS
      },
      {
        source: '/blog.html',
        headers: HTML_CACHE_HEADERS
      },
      {
        source: '/news.html',
        headers: HTML_CACHE_HEADERS
      },
      {
        source: '/:path*.html',
        headers: HTML_CACHE_HEADERS
      },
      {
        source: '/cases/:path*',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, follow' },
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/product-feed.json',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=7200, stale-while-revalidate=86400' },
          { key: 'X-Robots-Tag', value: 'noindex, follow' }
        ]
      },
      // CSS and JS: short browser cache, always revalidate to pick up patches quickly
      {
        source: '/assets/:path*.css',
        headers: [
          { key: 'Cache-Control', value: `public, max-age=60, s-maxage=3600, must-revalidate` }
        ]
      },
      {
        source: '/assets/:path*.js',
        headers: [
          { key: 'Cache-Control', value: `public, max-age=60, s-maxage=3600, must-revalidate` }
        ]
      },
      {
        source: '/data/:path*.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' },
          { key: 'X-Robots-Tag', value: 'noindex, follow' }
        ]
      },
      // Images / fonts / other static assets: long cache is fine (they rarely change)
      {
        source: '/assets/img/:path*',
        headers: [
          { key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }
        ]
      },
      {
        source: '/:path*.webp',
        headers: [
          { key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }
        ]
      }
    ];
  }
};

export default nextConfig;