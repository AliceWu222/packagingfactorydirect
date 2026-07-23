export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const SITE_URL = 'https://www.packagingfactorydirect.com';

const coreUrls = [
  '/',
  '/products.html',
  '/contact.html',
  '/faq.html',
  '/factory-capability.html',
  '/quality-control.html',
  '/sample-process.html',
  '/artwork-guidelines.html',
  '/moq-policy.html',
  '/shipping.html',
  '/custom-packaging-boxes.html',
  '/custom-gift-boxes.html',
  '/custom-magnetic-gift-boxes.html',
  '/custom-stand-up-pouches.html',
  '/custom-coffee-bags-with-valve.html',
  '/custom-pharmaceutical-packaging-boxes.html',
  '/custom-cosmetic-packaging-boxes.html',
  '/custom-food-packaging.html',
  '/custom-paper-bags.html',
  '/custom-labels-and-stickers.html',
  '/industry/food-and-restaurant-packaging-solutions.html',
  '/industry/pharmaceutical-medical-packaging-solutions.html',
  '/industry/cosmetic-packaging-solutions.html',
  '/industry/coffee-tea-packaging-solutions.html',
  '/blog/custom-packaging-rfq-checklist.html',
  '/blog/custom-packaging-moq-500-pcs-guide.html',
  '/blog/food-packaging-material-guide.html',
  '/blog/pharma-packaging-serialization-guide.html',
  '/blog/stand-up-pouch-material-structure-guide.html',
  '/news/ai-search-b2b-packaging-procurement-2026.html'
];

export async function GET() {
  return Response.json({
    version: 'v102-search-console-indexing-plan',
    site: SITE_URL,
    sitemapToSubmit: `${SITE_URL}/sitemap-index.xml`,
    fallbackSitemap: `${SITE_URL}/sitemap.xml`,
    gscProperty: SITE_URL,
    note: 'Submit sitemap-index.xml in Google Search Console Sitemaps. Use URL Inspection > Request indexing for the priority URLs below after verifying the property.',
    priorityUrls: coreUrls.map(path => `${SITE_URL}${path}`)
  }, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow'
    }
  });
}
