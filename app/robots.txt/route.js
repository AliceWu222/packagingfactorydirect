import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const CANONICAL_HOST = 'https://www.packagingfactorydirect.com';
const LEGACY_HOST = 'https://packagingfactorydirect.com';

async function readLocal() {
  const paths = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'robots.txt'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'robots.txt')
  ];
  for (const p of paths) {
    const t = await fs.readFile(p, 'utf8').catch(() => '');
    if (t && t.trim().length > 0) return t;
  }
  return 'User-agent: *\nAllow: /\nAllow: /llms.txt\nAllow: /ai-index.json\nAllow: /product-feed.json\nAllow: /data/ai-search-answer-cards.json\nAllow: /data/seo-geo-keyword-map.json\nSitemap: https://www.packagingfactorydirect.com/sitemap.xml\n';
}

function normalizeHost(text) {
  return text.replaceAll(LEGACY_HOST + '/', CANONICAL_HOST + '/').replaceAll(LEGACY_HOST + '\n', CANONICAL_HOST + '\n');
}

function ensureLine(text, line) {
  return text.includes(line) ? text : `${text.trimEnd()}\n${line}\n`;
}

function protectInternalFiles(text) {
  const rules = [
    'Disallow: /*.md$',
    'Disallow: /*.lock$',
    'Disallow: /*.log$',
    'Disallow: /README*',
    'Disallow: /ISR*',
    'Disallow: /R2_CMS*',
    'Disallow: /PFD_V*',
    'Disallow: /OPEN_THIS*',
    'Disallow: /DOWNLOAD_NOTE*',
    'Disallow: /package.json',
    'Disallow: /package-lock.json',
    'Disallow: /vercel.json',
    'Disallow: /.git/',
    'Disallow: /.vercel/',
    'Disallow: /node_modules/',
    'Disallow: /test-results/',
    'Disallow: /deliveries/'
  ];
  return rules.reduce((out, rule) => ensureLine(out, rule), text);
}

function keepSingleSitemapIndex(text) {
  const withoutSitemaps = text
    .split(/\r?\n/)
    .filter(line => !/^\s*Sitemap\s*:/i.test(line))
    .join('\n')
    .trimEnd();
  return `${withoutSitemaps}\nSitemap: ${CANONICAL_HOST}/sitemap-index.xml\n`;
}

// Explicitly allow mainstream AI search crawlers (ChatGPT, Gemini, Perplexity,
// Claude) so AI engines can read llms.txt, ai-index.json and product pages.
// Mirrors the industry-leading pattern used by LuxoPack.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Google-Extended',
  'PerplexityBot',
  'ClaudeBot',
  'anthropic-ai',
  'cohere-ai',
  'Bytespider'
];

function allowAiCrawlers(text) {
  let out = text.trimEnd() + '\n';
  for (const ua of AI_CRAWLERS) {
    out += `\nUser-agent: ${ua}\nAllow: /\n`;
  }
  return out;
}

export async function GET() {
  const raw = await readLocal();
  let text = protectInternalFiles(normalizeHost(raw));
  text = ensureLine(text, `Allow: ${CANONICAL_HOST}/ai-discovery.json`.replace(CANONICAL_HOST, ''));
  text = ensureLine(text, `Allow: /.well-known/ai-site.json`);
  text = allowAiCrawlers(text);
  text = keepSingleSitemapIndex(text);
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } });
}
