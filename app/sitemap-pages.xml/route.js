import { filterEntries, readSitemapEntries, sitemapXml, xmlResponse } from '../sitemap-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const entries = filterEntries(await readSitemapEntries(), 'pages');
  return xmlResponse(sitemapXml(entries));
}
