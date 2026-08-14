import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE_URL = 'https://www.packagingfactorydirect.com';
const pages = [
  'blog/packaging-specification-glossary-for-buyers.html',
  'blog/public-packaging-catalog-taxonomy-methodology.html',
  'editorial-and-source-policy.html'
];
const errors = [];

function localFileForUrl(value) {
  const url = new URL(value, `${SITE_URL}/`);
  if (url.origin !== SITE_URL) return null;
  const relative = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
  return path.join(ROOT, ...relative.split('/'));
}

for (const relative of pages) {
  const file = path.join(ROOT, ...relative.split('/'));
  if (!existsSync(file)) {
    errors.push(`${relative}: missing`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"\/>/)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]+)"\/>/)?.[1] || '';
  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (!canonical?.startsWith(`${SITE_URL}/`)) errors.push(`${relative}: missing www self canonical`);
  if (title.length < 30 || title.length > 65) errors.push(`${relative}: title length ${title.length}`);
  if (description.length < 120 || description.length > 165) errors.push(`${relative}: description length ${description.length}`);
  if (h1Count !== 1) errors.push(`${relative}: expected one H1, found ${h1Count}`);
  if (!html.includes('index, follow')) errors.push(`${relative}: index/follow missing`);
  if (/"@type"\s*:\s*"(?:Offer|AggregateRating|Review)"/.test(html)) errors.push(`${relative}: prohibited commercial/review schema`);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch (error) { errors.push(`${relative}: invalid JSON-LD (${error.message})`); }
  }
  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const value = href[1];
    if (/^(?:mailto:|https:\/\/wa\.me\/|#)/.test(value)) continue;
    const local = localFileForUrl(new URL(value, canonical).toString());
    if (local && !existsSync(local) && !local.endsWith(path.join('data', 'public-packaging-taxonomy.json'))) {
      errors.push(`${relative}: missing internal target ${value}`);
    }
  }
}

const datasetPath = path.join(ROOT, 'data', 'public-packaging-taxonomy.json');
const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
const familyTotal = dataset.familyCounts.reduce((sum, item) => sum + item.count, 0);
const uniqueUrls = new Set(dataset.items.map(item => item.url));
if (dataset.totalProducts !== 192 || dataset.items.length !== 192 || familyTotal !== 192 || uniqueUrls.size !== 192) {
  errors.push(`taxonomy: expected 192 total/items/family sum/unique URLs, found ${dataset.totalProducts}/${dataset.items.length}/${familyTotal}/${uniqueUrls.size}`);
}
for (const item of dataset.items) {
  const local = localFileForUrl(item.url);
  if (!local || !existsSync(local)) errors.push(`taxonomy: missing product target ${item.url}`);
}

const answers = JSON.parse(readFileSync(path.join(ROOT, 'data', 'ai-search-answer-cards.json'), 'utf8'));
const questions = answers.answerCards.map(card => card.question);
if (new Set(questions).size !== questions.length) errors.push('answer cards: duplicate questions');
for (const required of [
  'What is a packaging specification?',
  'What does the Packaging Factory Direct public catalog taxonomy measure?',
  'How does Packaging Factory Direct select sources and correct buyer guidance?'
]) {
  if (!questions.includes(required)) errors.push(`answer cards: missing ${required}`);
}

if (errors.length) {
  console.error('AI citation-readiness verification failed:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  newIndexablePages: pages.length,
  publicDatasetRows: dataset.items.length,
  publicDatasetFamilies: dataset.familyCounts.length,
  answerCards: answers.answerCards.length,
  prohibitedCommercialSchema: 0
}, null, 2));
