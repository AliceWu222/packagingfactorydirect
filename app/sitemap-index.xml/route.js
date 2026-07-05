import { sitemapIndexXml, xmlResponse } from '../sitemap-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  return xmlResponse(sitemapIndexXml());
}
