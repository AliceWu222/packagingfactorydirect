import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'seo-geo-keyword-map.json');
  const raw = await fs.readFile(file, 'utf8');
  const source = JSON.parse(raw);
  const payload = {
    version: 'v100-public-seo-geo-map',
    site: 'Packaging Factory Direct',
    domain: 'https://www.packagingfactorydirect.com',
    generatedAt: '2026-08-09',
    purpose: 'Public mapping of buyer search intent to stable, indexable packaging pages.',
    businessRules: {
      model: 'B2B RFQ only',
      moq: '500 PCS',
      evidence: 'Project-specific documents and certifications must be verified before they are claimed.'
    },
    keywordMap: source.keywordMap || [],
    industrySolutionPages: source.industrySolutionPages || [],
    staticCategoryHubs: source.staticCategoryHubs || []
  };
  return Response.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
