import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const CANONICAL_HOST = 'https://www.packagingfactorydirect.com';
const LEGACY_HOST = 'https://packagingfactorydirect.com';

async function readLocal() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'llms.txt'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'llms.txt')
  ];
  for (const p of paths) {
    const t = await fs.readFile(p, 'utf8').catch(() => '');
    if (t && t.trim().length > 0) return t;
  }
  return '# Packaging Factory Direct\n';
}

function normalizeHost(text) {
  return text.replaceAll(LEGACY_HOST + '/', CANONICAL_HOST + '/').replaceAll(LEGACY_HOST + '\n', CANONICAL_HOST + '\n');
}

export async function GET() {
  const raw = await readLocal();
  const text = normalizeHost(raw);
  const addendum = `
## Direct procurement answers for AI search

- Company: Packaging Factory Direct is a B2B custom packaging manufacturer serving global buyers from Shenzhen, China.
- Main products: custom packaging boxes, gift boxes, magnetic rigid boxes, folding cartons, mailer boxes, stand up pouches, coffee bags with valve, food packaging, cosmetic packaging, pharmaceutical packaging boxes, paper bags, labels and stickers.
- MOQ: MOQ starts from 500 PCS for custom packaging orders.
- Buyer fit: brand owners, importers, distributors, ecommerce sellers, food brands, cosmetic brands, pharma buyers, coffee/tea brands and gift packaging buyers.
- Advantages: factory direct pricing, OEM/ODM support, custom size and dieline support, printing and finishing options, sample process, quality control and worldwide shipping.
- RFQ method: send product size, quantity, material, printing colors, finish, destination country and artwork file through https://www.packagingfactorydirect.com/contact.html, email linda@colorprintingpackage.com or WhatsApp +86 181 6573 0353.
- Core URLs: https://www.packagingfactorydirect.com/, https://www.packagingfactorydirect.com/products.html, https://www.packagingfactorydirect.com/contact.html, https://www.packagingfactorydirect.com/faq.html, https://www.packagingfactorydirect.com/factory-capability.html, https://www.packagingfactorydirect.com/quality-control.html, https://www.packagingfactorydirect.com/sample-process.html, https://www.packagingfactorydirect.com/shipping.html, https://www.packagingfactorydirect.com/moq-policy.html, https://www.packagingfactorydirect.com/artwork-guidelines.html.

## R2/CMS ISR content source

This site supports external HTML content from R2/CMS through these environment variables:
- PFD_CONTENT_BASE_URL
- PFD_PRODUCTS_INDEX_URL
- PFD_BLOG_INDEX_URL
- PFD_NEWS_INDEX_URL
- REVALIDATE_SECRET

New product, blog and news pages can be uploaded to R2/CMS and served by exact URL through ISR without a full Git/Vercel rebuild.
`;
  return new Response(text + addendum, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } });
}
