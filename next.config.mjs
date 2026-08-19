const ONE_YEAR = 31536000;

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' }
];
const HTML_CACHE_HEADERS = [
  ...SECURITY_HEADERS,
  { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=7200, stale-while-revalidate=86400' }
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
    return [
      { source: '/sitemap.xml', destination: '/sitemap-index.xml', permanent: true },
      { source: '/index.html', destination: '/', permanent: true }
    ];
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
        source: '/:path*.md',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },
      {
        source: '/:path*.lock',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },
      {
        source: '/:path*.log',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },
      {
        source: '/package.json',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },
      {
        source: '/package-lock.json',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },
      {
        source: '/vercel.json',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store' }
        ]
      },
      {
        source: '/cases/:path*',
        headers: [
          ...SECURITY_HEADERS,
          { key: 'X-Robots-Tag', value: 'noindex, follow' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=7200, stale-while-revalidate=86400' }
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
      // Versioned CSS and JS: cache in the browser and at the edge for faster repeat visits.
      {
        source: '/assets/:path*.css',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/assets/:path*.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
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
      {
        source: '/llms.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/ai-index.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/ai-discovery.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/.well-known/ai-site.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      // Images / fonts / other static assets: medium cache so optimized
      // recompressed images propagate to browsers within a day while still
      // benefiting from edge caching.
      {
        source: '/assets/img/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/assets/:path*.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/assets/:path*.jpg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/assets/:path*.jpeg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/assets/:path*.svg',
        headers: [
          { key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }
        ]
      },
      {
        source: '/assets/:path*.woff2',
        headers: [
          { key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }
        ]
      },
      {
        source: '/downloads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/:path*.webp',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' }
        ]
      }
    ];
  }
};

export default nextConfig;
