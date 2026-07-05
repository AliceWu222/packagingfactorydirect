const ONE_YEAR = 31536000;

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
      { source: '/cases', destination: '/factory-capability.html', statusCode: 301 },
      { source: '/cases/:path*', destination: '/factory-capability.html', statusCode: 301 }
    ];
  },
  async headers() {
    return [
      // Homepage and major listing pages: keep browsers fresh while giving the CDN a longer ISR window.
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/products.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/blog.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/news.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/:path*.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' }
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
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate' },
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