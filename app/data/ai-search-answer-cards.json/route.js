import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const INTERNAL_PATTERN = /\b(?:ISR|R2|CMS|deployment|revalidat(?:e|ion)|internal setup)\b/i;

export async function GET() {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'ai-search-answer-cards.json');
  const raw = await fs.readFile(file, 'utf8');
  const source = JSON.parse(raw);
  const answerCards = (source.answerCards || []).filter(card => {
    const values = [card.question, card.answer, ...(card.urls || [])].filter(Boolean).join(' ');
    return !INTERNAL_PATTERN.test(values) && !/\.(?:md|lock|log)$/i.test(values);
  });
  const payload = {
    version: 'v100-public-buyer-answer-cards',
    site: 'Packaging Factory Direct',
    domain: 'https://www.packagingfactorydirect.com',
    generatedAt: '2026-08-09',
    contentPolicy: 'Buyer-facing answers only. No prices, inventory, ratings, reviews, certifications or test results are asserted without verifiable evidence.',
    answerCards
  };
  return Response.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
