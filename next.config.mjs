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
    '/*': ['./*.html','./products/**/*.html','./blog/**/*.html','./news/**/*.html','./assets/**/*','./data/**/*','./*.xml','./*.txt','./*.json','./*.md']
  },
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      },
      {
        source: '/products/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' },
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/blog/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' },
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/news/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' },
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' }
        ]
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ];
  }
};
export default nextConfig;
