import { merchantFeedData, SITE_URL } from '../merchant-feed-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const data = await merchantFeedData();
  return Response.json({
    version: data.version,
    site: SITE_URL,
    feed: `${SITE_URL}/google-merchant-feed.xml`,
    totalProducts: data.totalProducts,
    eligibleProductCount: data.eligibleProducts.length,
    missingPriceCount: data.missingPriceCount,
    policyNote: 'Google Merchant Center product data normally requires a real price that matches the landing page. RFQ-only products are reported here but excluded from the XML feed until a verified public price is supplied.',
    howToEnable: 'Add price values to product manifest items or create data/google-merchant-overrides.json with products keyed by canonical URL, path, slug or title.',
    sampleOverrideShape: {
      currency: 'USD',
      products: {
        'products/example-product.html': {
          price: '9.99 USD',
          availability: 'in_stock',
          brand: 'Packaging Factory Direct',
          mpn: 'example-product'
        }
      }
    },
    ineligibleProducts: data.ineligibleProducts.slice(0, 200)
  }, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow'
    }
  });
}
