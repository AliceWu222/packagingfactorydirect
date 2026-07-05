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
  }
};

export default nextConfig;