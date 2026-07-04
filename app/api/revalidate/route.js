import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_PREFIXES = [
  '/',
  '/products/',
  '/blog/',
  '/news/',
  '/industry/',
  '/custom-',
  '/products.html',
  '/blog.html',
  '/news.html',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/ai-index.json',
  '/product-feed.json',
  '/data/'
];

function normalizePath(value) {
  if (!value || typeof value !== 'string') return null;
  const clean = value.trim();
  if (!clean.startsWith('/')) return null;
  if (clean.includes('..')) return null;
  return clean;
}
function isAllowedPath(p) {
  return ALLOWED_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix));
}
function slugFromPath(p) {
  return String(p || '').split('/').pop().replace(/\.html$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}
function defaultPathForPublish(type, slug) {
  if (!type || !slug) return null;
  const clean = slugFromPath(slug);
  if (type === 'product' || type === 'products') return `/products/${clean}.html`;
  if (type === 'blog') return `/blog/${clean}.html`;
  if (type === 'news') return `/news/${clean}.html`;
  if (type === 'industry' || type === 'solution') return `/industry/${clean}.html`;
  if (type === 'category') return `/${clean}.html`;
  return null;
}
function addPublishScopePaths(paths, body) {
  const publishType = String(body.type || body.contentType || body.kind || '').toLowerCase();
  const publishPath = normalizePath(body.path) || defaultPathForPublish(publishType, body.slug);
  const out = new Set(paths);

  if (publishType === 'product' || publishType === 'products' || publishPath?.startsWith('/products/')) {
    if (publishPath) out.add(publishPath);
    out.add('/products.html');
    out.add('/');
    out.add('/index.html');
    out.add('/sitemap.xml');
    out.add('/product-feed.json');
    out.add('/ai-index.json');
  } else if (publishType === 'blog' || publishPath?.startsWith('/blog/')) {
    if (publishPath) out.add(publishPath);
    out.add('/blog.html');
    out.add('/');
    out.add('/index.html');
    out.add('/sitemap.xml');
    out.add('/ai-index.json');
    out.add('/llms.txt');
  } else if (publishType === 'news' || publishPath?.startsWith('/news/')) {
    if (publishPath) out.add(publishPath);
    out.add('/news.html');
    out.add('/');
    out.add('/index.html');
    out.add('/sitemap.xml');
    out.add('/ai-index.json');
    out.add('/llms.txt');
  } else if (publishType === 'industry' || publishType === 'solution' || publishPath?.startsWith('/industry/')) {
    if (publishPath) out.add(publishPath);
    out.add('/products.html');
    out.add('/');
    out.add('/index.html');
    out.add('/sitemap.xml');
    out.add('/ai-index.json');
  } else if (publishType === 'category' || publishPath?.startsWith('/custom-')) {
    if (publishPath) out.add(publishPath);
    out.add('/products.html');
    out.add('/');
    out.add('/index.html');
    out.add('/sitemap.xml');
    out.add('/ai-index.json');
  }

  return Array.from(out);
}
function tagsForPath(p) {
  if (p === '/' || p === '/index.html') return ['homepage'];
  if (p === '/sitemap.xml') return ['sitemap'];
  if (p === '/products.html') return ['products'];
  if (p === '/blog.html') return ['blog'];
  if (p === '/news.html') return ['news'];
  if (p.startsWith('/products/')) {
    const slug = slugFromPath(p);
    return ['products', 'product-slug', `product-${slug}`];
  }
  if (p.startsWith('/blog/')) {
    const slug = slugFromPath(p);
    return ['blog', 'blog-slug', `blog-${slug}`];
  }
  if (p.startsWith('/news/')) {
    const slug = slugFromPath(p);
    return ['news', 'news-slug', `news-${slug}`];
  }
  if (p.startsWith('/industry/')) {
    const slug = slugFromPath(p);
    return ['industry', 'industry-slug', `industry-${slug}`];
  }
  if (p.startsWith('/custom-')) {
    const slug = slugFromPath(p);
    return ['category', 'category-slug', `category-${slug}`];
  }
  if (p === '/product-feed.json') return ['products', 'product-feed'];
  if (p === '/ai-index.json') return ['products', 'blog', 'news', 'ai-index'];
  if (p === '/llms.txt') return ['blog', 'news', 'llms'];
  return [];
}
function getPaths(body, request) {
  const urlPath = request.nextUrl.searchParams.get('path');
  const one = body.path || urlPath;
  const many = Array.isArray(body.paths) ? body.paths : [];
  const raw = [one, ...many].map(normalizePath).filter(Boolean);
  return addPublishScopePaths(raw, body);
}
function getTags(body, request, paths) {
  const urlTag = request.nextUrl.searchParams.get('tag');
  const one = body.tag || urlTag;
  const many = Array.isArray(body.tags) ? body.tags : [];
  const explicit = [one, ...many].filter(Boolean).map(String);
  const fromPaths = paths.flatMap(tagsForPath);
  return [...new Set([...explicit, ...fromPaths])];
}
async function handle(request) {
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const secret = body.secret || request.nextUrl.searchParams.get('secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ ok: false, error: 'Invalid or missing revalidation secret' }, { status: 401 });
  }

  const paths = [...new Set(getPaths(body, request))];
  const tags = getTags(body, request, paths);

  if (!paths.length && !tags.length) {
    return Response.json({
      ok: false,
      error: 'Provide path/paths or type+slug. Example: {"type":"product","slug":"new-product"}'
    }, { status: 400 });
  }

  const rejected = paths.filter(p => !isAllowedPath(p));
  if (rejected.length) {
    return Response.json({ ok: false, error: 'Rejected path outside allowed ISR scope', rejected }, { status: 400 });
  }

  for (const p of paths) revalidatePath(p);
  for (const t of tags) revalidateTag(t);

  return Response.json({
    ok: true,
    revalidatedPaths: paths,
    revalidatedTags: tags,
    message: 'Precision ISR completed. Only the requested/new URL, its list page, homepage/feed routes and sitemap were refreshed.',
    seoProtection: {
      oldUrlsRegenerated: false,
      canonicalChanged: false,
      publishedTimeReset: false,
      fullSiteRebuildRequired: false
    },
    examples: {
      newProduct: { type: 'product', slug: 'custom-cardstock-product-boxes-foil-logo' },
      newBlog: { type: 'blog', slug: 'new-packaging-guide' },
      newNews: { type: 'news', slug: 'packaging-market-update' }
    }
  });
}

export async function POST(request) { return handle(request); }
export async function GET(request) { return handle(request); }
