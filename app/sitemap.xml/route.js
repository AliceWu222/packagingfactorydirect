const SITEMAP_INDEX_URL = 'https://www.packagingfactorydirect.com/sitemap-index.xml';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

// Preserve the legacy URL for existing crawlers without publishing a second,
// partially overlapping URL set. robots.txt continues to advertise the index.
export async function GET() {
  return new Response(null, {
    status: 308,
    headers: {
      Location: SITEMAP_INDEX_URL,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
