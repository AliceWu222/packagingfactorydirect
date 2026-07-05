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
    '/*': ['./*.html', './products/**/*.html', './blog/**/*.html', './news/**/*.html', './assets/**/*', './data/**/*', './*.xml', './*.txt', './*.json', './*.md']
  },
  async rewrites() {
    return [
      { source: '/assets/:path*', destination: '/api/assets/:path*' }
    ];
  },
  async headers() {
    return [
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