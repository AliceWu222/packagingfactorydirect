import { merchantFeedData, SITE_URL, xmlEscape } from '../merchant-feed-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

function itemXml(item) {
  return `    <item>
      <g:id>${xmlEscape(item.id)}</g:id>
      <g:title>${xmlEscape(item.title)}</g:title>
      <g:description>${xmlEscape(item.description)}</g:description>
      <g:link>${xmlEscape(item.link)}</g:link>
      <g:image_link>${xmlEscape(item.imageLink)}</g:image_link>
      <g:availability>${xmlEscape(item.availability)}</g:availability>
      <g:price>${xmlEscape(item.price)}</g:price>
      <g:condition>${xmlEscape(item.condition)}</g:condition>
      <g:brand>${xmlEscape(item.brand)}</g:brand>
      <g:mpn>${xmlEscape(item.mpn)}</g:mpn>
      <g:google_product_category>${xmlEscape(item.googleProductCategory)}</g:google_product_category>
      <g:custom_label_0>${xmlEscape(item.customLabel0)}</g:custom_label_0>
    </item>`;
}

export async function GET() {
  const data = await merchantFeedData();
  const items = data.eligibleProducts.map(itemXml).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Packaging Factory Direct Google Merchant Feed</title>
    <link>${SITE_URL}/</link>
    <description>Compliant Google Merchant Center product feed for custom packaging items with verified public prices. RFQ-only products are excluded until a real landing-page price is supplied.</description>
    <lastBuildDate>${new Date(data.generatedAt).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, follow'
    }
  });
}
