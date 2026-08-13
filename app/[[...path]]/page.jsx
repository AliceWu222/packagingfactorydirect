import fs from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { readLocalHtmlInventory } from '../content-inventory.js';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 3600;

const ROOT = /*turbopackIgnore: true*/ process.cwd();
const SITE_URL = 'https://www.packagingfactorydirect.com';
const ISR_SECONDS = Number(process.env.PFD_ISR_SECONDS || process.env.PRODUCT_PAGE_REVALIDATE_SECONDS || 3600);

const REMOTE_DETAIL_PREFIXES = ['products/', 'blog/', 'news/'];
const REMOTE_LISTING_PAGES = new Set(['products.html', 'blog.html', 'news.html']);
const PRODUCT_LIST_INITIAL_RENDER_LIMIT = Number(process.env.PFD_PRODUCT_LIST_INITIAL_RENDER_LIMIT || 36);

function contentBaseUrl() {
  return (
    process.env.PFD_CONTENT_BASE_URL ||
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.CMS_CONTENT_BASE_URL ||
    ''
  ).trim();
}
function remoteFirstEnabled() {
  return String(process.env.PFD_REMOTE_CONTENT_FIRST || '').toLowerCase() === 'true';
}
function remoteListsEnabled() {
  return String(process.env.PFD_ENABLE_REMOTE_LISTS || 'true').toLowerCase() !== 'false';
}
function normalizeBase(base) {
  if (!base) return '';
  return base.endsWith('/') ? base : `${base}/`;
}
function remoteUrlForRel(rel) {
  const base = normalizeBase(contentBaseUrl());
  if (!base) return null;
  return new URL(rel.replace(/^\/+/, ''), base).toString();
}
function isRemoteEligible(rel) {
  return REMOTE_LISTING_PAGES.has(rel) || REMOTE_DETAIL_PREFIXES.some(prefix => rel.startsWith(prefix));
}
function manifestUrlFor(kind) {
  const upper = kind.toUpperCase();
  const specific = process.env[`PFD_${upper}_INDEX_URL`] || process.env[`PFD_${upper}_MANIFEST_URL`];
  if (specific) return specific;
  const base = normalizeBase(contentBaseUrl());
  if (!base) return null;
  return new URL(`data/${kind}.remote.json`, base).toString();
}
function safeResolve(relPath) {
  const resolved = path.resolve(/*turbopackIgnore: true*/ ROOT, relPath);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}
async function getParamObject(params) {
  return params && typeof params.then === 'function' ? await params : params;
}
function requestToHtmlPath(parts) {
  const joined = (parts || []).join('/');
  if (!joined || joined === 'index' || joined === 'index.html') return 'index.html';
  if (joined.endsWith('.html')) return joined;
  if (joined.includes('.') && !joined.endsWith('.html')) return null;
  return `${joined}.html`;
}
function getKindFromRel(rel) {
  if (rel === 'products.html' || rel.startsWith('products/')) return 'products';
  if (rel === 'blog.html' || rel.startsWith('blog/')) return 'blog';
  if (rel === 'news.html' || rel.startsWith('news/')) return 'news';
  if (rel === 'index.html') return 'homepage';
  if (rel === 'sitemap.xml') return 'sitemap';
  if (rel.startsWith('industry/')) return 'industry';
  if (!rel.includes('/') && rel.endsWith('.html') && rel.startsWith('custom-')) return 'category';
  return 'page';
}
function slugFromRel(rel) {
  return rel.split('/').pop().replace(/\.html$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}
function cacheTagsForRel(rel) {
  const kind = getKindFromRel(rel);
  if (kind === 'homepage') return ['homepage'];
  if (kind === 'sitemap') return ['sitemap'];
  if (rel === 'products.html') return ['products'];
  if (rel === 'blog.html') return ['blog'];
  if (rel === 'news.html') return ['news'];
  const slug = slugFromRel(rel);
  if (kind === 'products') return ['products', 'product-slug', `product-${slug}`];
  if (kind === 'blog') return ['blog', 'blog-slug', `blog-${slug}`];
  if (kind === 'news') return ['news', 'news-slug', `news-${slug}`];
  if (kind === 'industry') return ['industry', 'industry-slug', `industry-${slug}`];
  if (kind === 'category') return ['category', 'category-slug', `category-${slug}`];
  return ['page'];
}
function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function normalizeRootHref(url, kind) {
  if (!url) return '#';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
  if (url.startsWith('/')) return url;
  if (url.startsWith(`${kind}/`)) return `/${url}`;
  if (url.endsWith('.html')) return `/${kind}/${url}`;
  return `/${url}`;
}
function normalizeImageSrc(src, sourceUrl) {
  if (!src || /^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  try {
    if (sourceUrl) return new URL(src, sourceUrl).toString();
  } catch {}
  return src;
}
function rewriteRemoteImageUrls(bodyHtml, sourceUrl) {
  if (!sourceUrl) return bodyHtml;
  return bodyHtml
    .replace(/(<img\b[^>]*?\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (all, before, src, after) => {
      return before + htmlEscape(normalizeImageSrc(src, sourceUrl)) + after;
    })
    .replace(/(<source\b[^>]*?\bsrcset=["'])([^"']+)(["'][^>]*>)/gi, (all, before, srcset, after) => {
      const rewritten = srcset.split(',').map(part => {
        const bits = part.trim().split(/\s+/);
        if (!bits[0]) return part;
        bits[0] = normalizeImageSrc(bits[0], sourceUrl);
        return bits.join(' ');
      }).join(', ');
      return before + htmlEscape(rewritten) + after;
    });
}
function stripDuplicateBodyAssets(bodyHtml) {
  // Layout already loads /assets/css/style.css and /assets/js/main.js.
  // Removing duplicate body script improves INP/TBT without changing the static HTML source files.
  // Also strip any other <link> to style.css so we can inject a versioned one via layout only.
  return bodyHtml
    .replace(/<script\s+src=["'](?:\.\.\/|\.\/)?assets\/js\/main\.js["']\s*><\/script>/gi, '')
    .replace(/<link\s+href=["'](?:\.\.\/|\.\/)?assets\/css\/style\.css["']\s+rel=["']stylesheet["']\s*\/?>/gi, '')
    .replace(/<link\s+rel=["']stylesheet["']\s+href=["'](?:\.\.\/|\.\/)?assets\/css\/style\.css["']\s*\/?>/gi, '');
}
async function readLocalHtml(rel) {
  if (!rel || !rel.endsWith('.html')) return null;
  const file = safeResolve(rel);
  if (!file) return null;
  try {
    const html = await fs.readFile(file, 'utf8');
    return { html, rel, source: 'local', sourceUrl: null };
  } catch {
    return null;
  }
}
async function fetchRemoteHtml(rel) {
  if (!isRemoteEligible(rel)) return null;
  const url = remoteUrlForRel(rel);
  if (!url) return null;

  const response = await fetch(url, {
    next: { revalidate: ISR_SECONDS, tags: [...cacheTagsForRel(rel), `path-${rel.replaceAll('/', '-')}`] }
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Remote content fetch failed for ${rel}: ${response.status}`);
  }

  const html = await response.text();
  if (!html || !/<html|<body|<section|<main|<article/i.test(html)) return null;

  return { html, rel, source: 'r2', sourceUrl: url };
}
function normalizeManifestItems(json, kind) {
  if (!json) return [];
  const raw = Array.isArray(json)
    ? json
    : (json.items || json.products || json.posts || json.news || json.blog || json.data || []);
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      title: item.title || item.name || '',
      url: item.url || item.href || item.path || '',
      description: item.description || item.summary || item.excerpt || '',
      image: item.image || item.img || item.thumbnail || '',
      category: item.category || item.type || (kind === 'products' ? 'OEM & Customize' : kind.toUpperCase()),
      keywords: item.keywords || item.search || '',
      publishedTime: item.publishedTime || item.datePublished || item.publishDate || '',
      modifiedTime: item.modifiedTime || item.dateModified || item.lastmod || ''
    }))
    .filter(item => item.title && item.url);
}
async function fetchRemoteManifest(kind) {
  if (!remoteListsEnabled()) return [];
  const url = manifestUrlFor(kind);
  if (!url) return [];

  const response = await fetch(url, {
    next: { revalidate: ISR_SECONDS, tags: [kind, `${kind}-manifest`] }
  });

  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Remote ${kind} manifest fetch failed: ${response.status}`);

  const json = await response.json().catch(() => null);
  return normalizeManifestItems(json, kind);
}
function dedupeManifestItems(items, kind) {
  const seen = new Set();
  return items.filter((item) => {
    const href = normalizeRootHref(item.url, kind).toLowerCase();
    const key = href || `${item.title}|${item.description}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function productListLoaderScript(items, kind) {
  if (kind !== 'products' || items.length <= PRODUCT_LIST_INITIAL_RENDER_LIMIT) return '';
  const renderedUrls = items.slice(0, PRODUCT_LIST_INITIAL_RENDER_LIMIT).map(item => normalizeRootHref(item.url, kind));
  const payload = JSON.stringify({ renderedUrls }).replace(/</g, '\\u003c');
  return `<script id="pfd-products-rendered" type="application/json">${payload}</script><script>(function(){var done=false;function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}function abs(u){u=String(u||'').trim();if(!u)return '';try{var x=new URL(u,location.origin);var h=x.hostname.toLowerCase();if(x.origin===location.origin||h==='packagingfactorydirect.com'||h==='www.packagingfactorydirect.com')return x.pathname+x.search;return x.href;}catch(e){if(u.indexOf('./')===0)u=u.slice(2);return u.charAt(0)==='/'?u:'/'+u;}}function card(p){var href=abs(p.url||'');var title=esc(p.title||'');var desc=esc(p.description||'');var cat=esc(p.category||'OEM & Customize');var img=p.image?'<img alt="'+title+'" decoding="async" loading="lazy" src="'+esc(abs(p.image))+'"/>':'';var search=esc([p.title,p.description,p.category,(p.buyerIntentKeywords||[]).join(' ')].filter(Boolean).join(' '));return '<article class="product-card remote-r2-card" data-search="'+search+'"><a href="'+esc(href)+'">'+img+'<div class="card-body"><span class="tag">'+cat+'</span><h3>'+title+'</h3><p>'+desc+'</p></div></a></article>';}
function load(){if(done)return;done=true;var grid=document.querySelector('.grid');var state=document.getElementById('pfd-products-rendered');if(!grid||!state)return;var rendered=[];try{rendered=JSON.parse(state.textContent||'{}').renderedUrls||[];}catch(e){}var seen=new Set(rendered.map(function(u){return abs(u).toLowerCase();}));fetch('/product-feed.json',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(data){var products=(data&&data.products)||[];var html='';products.forEach(function(p){var href=abs(p.url||'');var key=href.toLowerCase();if(!href||seen.has(key))return;seen.add(key);html+=card(p);});if(html){grid.insertAdjacentHTML('beforeend',html);document.dispatchEvent(new CustomEvent('pfd:products-loaded'));}state.remove();}).catch(function(){});}if('requestIdleCallback'in window){requestIdleCallback(load,{timeout:1800});}else{setTimeout(load,900);}window.addEventListener('scroll',load,{once:true,passive:true});window.addEventListener('mousemove',load,{once:true,passive:true});})();</script>`;
}
function productListLoaderScriptForRenderedUrls() {
  return `<script>(function(){var done=false;function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}function abs(u){u=String(u||'').trim();if(!u)return '';try{var x=new URL(u,location.origin);var h=x.hostname.toLowerCase();if(x.origin===location.origin||h==='packagingfactorydirect.com'||h==='www.packagingfactorydirect.com')return x.pathname+x.search;return x.href;}catch(e){if(u.indexOf('./')===0)u=u.slice(2);return u.charAt(0)==='/'?u:'/'+u;}}function card(p){var href=abs(p.url||'');var title=esc(p.title||'');var desc=esc(p.description||'');var cat=esc(p.category||'OEM & Customize');var img=p.image?'<img alt="'+title+'" decoding="async" loading="lazy" src="'+esc(abs(p.image))+'"/>':'';var search=esc([p.title,p.description,p.category,(p.buyerIntentKeywords||[]).join(' ')].filter(Boolean).join(' '));return '<article class="product-card remote-r2-card" data-search="'+search+'"><a href="'+esc(href)+'">'+img+'<div class="card-body"><span class="tag">'+cat+'</span><h3>'+title+'</h3><p>'+desc+'</p></div></a></article>';}
function load(){if(done)return;done=true;var grid=document.querySelector('.grid');if(!grid)return;var seen=new Set(Array.prototype.map.call(grid.querySelectorAll('a[href]'),function(a){return abs(a.getAttribute('href')).toLowerCase();}));fetch('/product-feed.json',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(data){var products=(data&&data.products)||[];var html='';products.forEach(function(p){var href=abs(p.url||'');var key=href.toLowerCase();if(!href||seen.has(key))return;seen.add(key);html+=card(p);});if(html){grid.insertAdjacentHTML('beforeend',html);document.dispatchEvent(new CustomEvent('pfd:products-loaded'));}}).catch(function(){});}if('requestIdleCallback'in window){requestIdleCallback(load,{timeout:1800});}else{setTimeout(load,900);}window.addEventListener('scroll',load,{once:true,passive:true});window.addEventListener('mousemove',load,{once:true,passive:true});})();</script>`;
}
function trimProductListingHtml(html) {
  const cards = Array.from(html.matchAll(/<article\s+class=["']product-card["'][\s\S]*?<\/article>/gi));
  if (cards.length <= PRODUCT_LIST_INITIAL_RENDER_LIMIT) return html;
  const renderedUrls = [];
  let output = '';
  let lastIndex = 0;
  cards.forEach((match, index) => {
    output += html.slice(lastIndex, match.index);
    const cardHtml = match[0];
    if (index < PRODUCT_LIST_INITIAL_RENDER_LIMIT) {
      output += cardHtml;
      const hrefMatch = cardHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
      if (hrefMatch) renderedUrls.push(hrefMatch[1]);
    }
    lastIndex = match.index + cardHtml.length;
  });
  output += html.slice(lastIndex);
  const loader = productListLoaderScriptForRenderedUrls();
  if (/<\/body>/i.test(output)) return output.replace(/<\/body>/i, `${loader}</body>`);
  return output + loader;
}
function removeDuplicateFactoryBlogGallery(html) {
  const orphanDuplicate = /(<\/article>)\s*<h3>\s*<a\s+href=["']blog\/factory-production-showroom-qc-office-trade-show-gallery\.html["'][\s\S]*?<\/h3>\s*<p>[\s\S]*?<\/p>\s*<\/div>\s*<\/article>/i;
  return html.replace(orphanDuplicate, '$1');
}
function compactSearchValue(value) {
  const words = decodeBasicHtmlEntities(value).replace(/\s+/g, ' ').trim().split(' ');
  const seen = new Set();
  const kept = [];
  let length = 0;
  for (const word of words) {
    const key = word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    if (!key || seen.has(key)) continue;
    if (length + word.length + 1 > 480) break;
    seen.add(key);
    kept.push(word);
    length += word.length + 1;
  }
  return htmlEscape(kept.join(' '));
}
function compactProductSearchAttributes(html) {
  return html.replace(
    /(<article\b[^>]*class=["'][^"']*\bproduct-card\b[^"']*["'][^>]*\bdata-search=["'])([^"']*)(["'][^>]*>)/gi,
    (all, before, searchValue, after) => `${before}${compactSearchValue(searchValue)}${after}`
  );
}
function optimizeListingOutputHtml(html, rel) {
  if (rel === 'products.html') return compactProductSearchAttributes(html);
  if (rel === 'blog.html') return removeDuplicateFactoryBlogGallery(html);
  return html;
}
function cardForItem(item, kind, sourceUrl) {
  const href = normalizeRootHref(item.url, kind);
  const title = htmlEscape(item.title);
  const desc = htmlEscape(item.description);
  const category = htmlEscape(item.category || (kind === 'products' ? 'OEM & Customize' : kind.toUpperCase()));
  const image = normalizeImageSrc(item.image, sourceUrl || manifestUrlFor(kind));

  if (kind === 'products') {
    const search = htmlEscape([item.title, item.description, item.category, item.keywords].filter(Boolean).join(' '));
    const imgHtml = image ? `<img alt="${title}" decoding="async" loading="lazy" src="${htmlEscape(image)}"/>` : '';
    return `<article class="product-card remote-r2-card" data-search="${search}"><a href="${htmlEscape(href)}">${imgHtml}<div class="card-body"><span class="tag">${category}</span><h3>${title}</h3><p>${desc}</p></div></a></article>`;
  }

  return `<article class="card remote-r2-card"><div class="card-body"><span class="tag">${category}</span><h3><a href="${htmlEscape(href)}">${title}</a></h3><p>${desc}</p></div></article>`;
}
function appendBlogCards(html, cards) {
  if (!cards) return html;
  return html.replace(
    /<\/div>\s*<\/section>\s*(?=<div class=["']floating["'])/i,
    `${cards}</div></section>`
  );
}
async function augmentListingHtml(html, rel) {
  const kind = rel === 'products.html' ? 'products' : rel === 'blog.html' ? 'blog' : rel === 'news.html' ? 'news' : null;
  if (!kind) return html;

  const remoteItems = await fetchRemoteManifest(kind).catch(() => []);
  const localItems = kind === 'blog' ? await readLocalHtmlInventory('blog') : [];
  const items = dedupeManifestItems([...remoteItems, ...localItems], kind);
  if (!items.length) return html;

  const newItems = items.filter(item => !html.includes(`href="${normalizeRootHref(item.url, kind)}"`) && !html.includes(`href="${item.url}"`));
  const initialItems = kind === 'products' ? newItems.slice(0, PRODUCT_LIST_INITIAL_RENDER_LIMIT) : newItems;
  const cards = initialItems
    .map(item => cardForItem(item, kind, manifestUrlFor(kind)))
    .join('');

  const deferred = productListLoaderScript(newItems, kind);
  if (!cards && !deferred) return html;

  if (kind === 'blog') return appendBlogCards(html, cards) + deferred;
  return html.replace(/<div class=["']grid["']>/i, match => `${match}${cards}`) + deferred;
}
async function loadHtml(params) {
  const p = await getParamObject(params);
  const rel = requestToHtmlPath(p?.path || []);
  if (!rel) notFound();

  let result = null;

  if (remoteFirstEnabled() && isRemoteEligible(rel)) {
    result = await fetchRemoteHtml(rel);
  }
  if (!result) {
    result = await readLocalHtml(rel);
  }
  if (!result && isRemoteEligible(rel)) {
    result = await fetchRemoteHtml(rel);
  }
  if (!result) notFound();

  if (result.source === 'local' && REMOTE_LISTING_PAGES.has(rel)) {
    result.html = await augmentListingHtml(result.html, rel);
  }
  if (REMOTE_LISTING_PAGES.has(rel)) {
    result.html = optimizeListingOutputHtml(result.html, rel);
  }
  return result;
}
function getTitle(html, rel) {
  const strategic = STRATEGIC_META[rel];
  if (strategic?.title) return strategic.title;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : 'Packaging Factory Direct';
}

const LISTING_META = {
  'products.html': {
    title: 'Custom Packaging Products | Packaging Factory Direct',
    description: 'Browse 182 custom packaging products for boxes, pouches, paper bags, labels, food, cosmetic and pharmaceutical projects. MOQ 500 PCS; request an OEM/ODM quote.'
  },
  'blog.html': {
    title: 'Custom Packaging Blog & B2B Buyer Guides',
    description: 'Read practical custom packaging guides covering materials, structures, finishes, testing, supplier checks and RFQ preparation for B2B procurement teams.'
  },
  'news.html': {
    title: 'Custom Packaging News & Industry Updates',
    description: 'Follow custom packaging market, material, production and procurement updates for brands, importers and B2B buyers sourcing factory-direct packaging.'
  }
};

function decodeBasicHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function repairTextEncoding(value) {
  return decodeBasicHtmlEntities(value)
    .replaceAll('Â·', '·')
    .replaceAll('â€“', '–')
    .replaceAll('â€”', '—')
    .replaceAll('â€™', '’')
    .replaceAll('â€œ', '“')
    .replaceAll('â€', '”')
    .replaceAll('éˆ¥?', '—')
    .replaceAll('鈥?', '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortenAtWordBoundary(value, maxLength) {
  const clean = repairTextEncoding(value);
  if (clean.length <= maxLength) return clean;
  const candidate = clean.slice(0, maxLength + 1);
  const cut = candidate.lastIndexOf(' ');
  return (cut >= Math.floor(maxLength * 0.68) ? candidate.slice(0, cut) : clean.slice(0, maxLength))
    .replace(/[\s|,;:&–—-]+$/g, '')
    .trim();
}

function seoTitleForRel(rawTitle, rel) {
  if (LISTING_META[rel]?.title) return LISTING_META[rel].title;
  let title = repairTextEncoding(rawTitle)
    .replace(/\s*\|\s*OEM Custom Packaging MOQ 500 PCS\s*$/i, '')
    .replace(/\s*\|\s*Packaging Factory Direct\s*$/i, '')
    .trim();
  if (getKindFromRel(rel) === 'products' && title.length < 30) {
    title = `${title} | Custom Packaging`;
  }
  if (title.length <= 60) return title;
  return shortenAtWordBoundary(title, 60);
}

function seoDescriptionForRel(rawDescription, rel) {
  if (LISTING_META[rel]?.description) return LISTING_META[rel].description;
  const kind = getKindFromRel(rel);
  let description = repairTextEncoding(rawDescription);
  if (description.length < 120) {
    const suffix = kind === 'products'
      ? ' Request an OEM/ODM quotation; MOQ starts from 500 PCS.'
      : ' Read the practical specifications and RFQ guidance for B2B buyers.';
    description = `${description.replace(/[.\s]+$/g, '')}.${suffix}`.trim();
  }
  if (description.length > 160) {
    description = `${shortenAtWordBoundary(description, 159).replace(/[.\s]+$/g, '')}.`;
  }
  return description;
}

const STRATEGIC_META = {
  'index.html': {
    title: 'Custom Packaging Manufacturer | Packaging Factory Direct',
    description: 'Custom packaging manufacturer for boxes, pouches, paper bags and labels. MOQ 500 PCS, OEM/ODM, custom printing and worldwide shipping. Request a factory quote.'
  },
  'products/hyaluronic-acid-dermal-filler-packaging-boxes-medical-aesthetic.html': {
    title: 'Dermal Filler Packaging Boxes Manufacturer | MOQ 500 PCS',
    description: 'Custom dermal filler packaging boxes for aesthetic clinics and medical brands. MOQ 500 PCS with vial inserts, QR codes, batch panels and custom printing.'
  },
  'products/luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html': {
    title: 'Luxury Rigid Gift Boxes Manufacturer | MOQ 500 PCS',
    description: 'Luxury rigid gift boxes with magnetic closures, ribbon and EVA inserts. MOQ 500 PCS with custom sizes, logo printing, foil, embossing and export packing.'
  },
  'products/foldable-magnetic-boxes.html': {
    title: 'Foldable Magnetic Boxes Manufacturer | MOQ 500 PCS',
    description: 'Foldable magnetic boxes for premium retail and gift packaging. MOQ 500 PCS with custom sizes, greyboard, inserts, foil stamping and soft-touch finishes.'
  }
};

function getDescription(html, rel) {
  // Runtime descriptions intentionally override older static meta on strategic pages.
  const kind = getKindFromRel(rel);
  if (STRATEGIC_META[rel]?.description) return STRATEGIC_META[rel].description;
  const slug = slugFromRel(rel).replace(/-/g, ' ');
  const short = slug.charAt(0).toUpperCase() + slug.slice(1);
  const strategicDescriptions = {
    'faq.html': 'FAQ for B2B custom packaging buyers: MOQ 500 PCS, OEM/ODM options, sample process, artwork files, materials, printing finishes, lead time, shipping and RFQ requirements.',
    'factory-capability.html': 'Factory capability for custom packaging buyers: OEM/ODM boxes, bags, pouches and printed paper packaging with MOQ 500 PCS, custom dielines, material sourcing and export production support.',
    'quality-control.html': 'Quality control process for B2B custom packaging orders, covering material checks, artwork review, printing inspection, finishing approval, carton packing and pre-shipment checks.',
    'sample-process.html': 'Custom packaging sample process for B2B buyers: dieline review, artwork check, material confirmation, prototype sampling, buyer approval and mass production setup.',
    'shipping.html': 'Shipping and lead time guide for custom packaging orders, including carton packing, export delivery, destination planning, sample timing and worldwide freight coordination.',
    'moq-policy.html': 'MOQ 500 PCS policy for custom packaging buyers, covering custom boxes, paper bags, pouches, labels and printed packaging with factory-direct OEM/ODM production.',
    'artwork-guidelines.html': 'Artwork guidelines for custom packaging RFQ: dielines, bleed, CMYK and Pantone color, logo files, fonts, barcode placement, prepress checks and print-ready packaging files.',
    'custom-packaging-boxes.html': 'Custom packaging boxes manufacturer for B2B buyers. MOQ 500 PCS, OEM/ODM rigid boxes, folding cartons, mailer boxes, gift boxes, custom size, printing and finishes.',
    'custom-gift-boxes.html': 'Custom gift boxes manufacturer for brands, importers and retailers. MOQ 500 PCS, OEM/ODM rigid boxes, magnetic boxes, inserts, foil stamping and premium print finishes.',
    'custom-magnetic-gift-boxes.html': 'Custom magnetic gift boxes manufacturer with MOQ 500 PCS, foldable or rigid structures, logo printing, foil stamping, inserts and premium retail packaging support.',
    'custom-stand-up-pouches.html': 'Custom stand up pouches manufacturer for food, coffee, pet food, supplements and cosmetics. MOQ 500 PCS, laminated film, zipper, valve, spout and custom printing.',
    'custom-coffee-bags-with-valve.html': 'Custom coffee bags with valve for roasters and beverage brands. MOQ 500 PCS, flat bottom or stand up pouches, degassing valve, zipper and branded printing.',
    'custom-pharmaceutical-packaging-boxes.html': 'Custom pharmaceutical packaging boxes manufacturer for medical and healthcare buyers. MOQ 500 PCS, serialized cartons, GS1/DataMatrix support, security labels and QC checks.',
    'custom-cosmetic-packaging-boxes.html': 'Custom cosmetic packaging boxes manufacturer for skincare, beauty and makeup brands. MOQ 500 PCS, OEM/ODM cartons, rigid boxes, labels, inserts and premium finishes.',
    'custom-food-packaging.html': 'Custom food packaging manufacturer for restaurants, bakeries, snacks and beverage brands. MOQ 500 PCS, food boxes, bags, wraps, trays, greaseproof paper and branded printing.',
    'custom-paper-bags.html': 'Custom paper bags manufacturer for retail, gift, apparel and luxury brands. MOQ 500 PCS, kraft or art paper, handles, logo printing, foil stamping and OEM sizes.',
    'custom-labels-and-stickers.html': 'Custom labels and stickers manufacturer for B2B packaging buyers. MOQ 500 PCS, product labels, security labels, QR codes, foil look, waterproof options and custom rolls or sheets.'
  };
  if (strategicDescriptions[rel]) return strategicDescriptions[rel];
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (m) return m[1].trim();
  const kw = short.length > 6 ? short : 'custom packaging';
  if (rel === 'index.html') return 'Packaging Factory Direct is a B2B custom packaging manufacturer offering OEM/ODM boxes, bags, pouches, labels and paper printing. MOQ 500 PCS, factory direct from Shenzhen, worldwide shipping.';
  if (rel === 'products.html') return 'Browse the full custom packaging product catalog: gift boxes, magnetic boxes, mailer boxes, stand-up pouches, coffee bags, pharma cartons, paper bags and labels. MOQ 500 PCS, factory direct, OEM and ODM supported.';
  if (rel === 'blog.html') return 'Packaging manufacturer blog with technical guides on custom gift boxes, magnetic packaging, mailer boxes, paper bags, food packaging, pharma cartons and B2B RFQ best practices. Written for procurement teams and brand owners.';
  if (rel === 'news.html') return 'Latest updates from Packaging Factory Direct on market trends, new packaging categories, MOQ policy, factory capability and supplier procurement news for B2B custom packaging buyers.';
  if (rel === 'about.html') return 'About Packaging Factory Direct — a Shenzhen-based B2B custom packaging manufacturer serving global brands with OEM/ODM boxes, bags, pouches and printing. MOQ 500 PCS, factory direct pricing.';
  if (rel === 'contact.html') return 'Contact Packaging Factory Direct for a factory-direct quotation. Reach Linda Wang via WhatsApp, email or RFQ form for custom packaging with MOQ 500 PCS, OEM/ODM support and worldwide shipping.';
  if (kind === 'products') return `${short} custom packaging manufacturer page for B2B buyers. MOQ 500 PCS, OEM/ODM, factory direct pricing, material/application/industry guidance and RFQ support from Shenzhen.`;
  if (kind === 'blog') return `${short} — technical guide from Packaging Factory Direct. Custom packaging manufacturer, MOQ 500 PCS, OEM/ODM, factory-direct RFQ support.`;
  if (kind === 'news') return `${short} — market update from Packaging Factory Direct, B2B custom packaging manufacturer. MOQ 500 PCS, factory direct, OEM/ODM.`;
  if (kind === 'industry') return `${short} — industry packaging solutions from Packaging Factory Direct. Custom manufacturer, MOQ 500 PCS, OEM/ODM, factory direct.`;
  if (kind === 'category') return `${short} — category from Packaging Factory Direct. B2B custom packaging manufacturer, MOQ 500 PCS, OEM/ODM, factory direct pricing.`;
  return `${short} — Packaging Factory Direct, B2B custom packaging manufacturer. MOQ 500 PCS, OEM/ODM, factory direct.`;
}
function getMeta(html, attr, name) {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}
function getCanonical(html, rel, sourceUrl) {
  if (rel === 'index.html') return SITE_URL + '/';
  return `${SITE_URL}/${rel}`;
}
function getOgImage(html, sourceUrl) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (m) return normalizeImageSrc(m[1].trim(), sourceUrl);
  return `${SITE_URL}/assets/img/hero/hero-1.webp`;
}
function repairCorruptedLogoMarkup(bodyHtml) {
  // Server-side repair for legacy mojibake like: <span class="logo-mark">▖?/span>
  // Runtime DOM repair may run too late or fail when the broken span swallows sibling text.
  return bodyHtml
    .replace(/<span class=["']logo-mark["']>[^<]{0,12}\?\/span>\s*<span>/gi, '<span class="logo-mark">▱</span><span>')
    .replace(/<span class=["']logo-mark["']>[^<]{0,12}锟[^<]*<span>/gi, '<span class="logo-mark">▱</span><span>')
    .replace(/<span class=["']logo-mark["']>[^<]{0,12}\ufffd[^<]*<span>/gi, '<span class="logo-mark">▱</span><span>');
}
function repairVisibleMojibake(bodyHtml) {
  return bodyHtml
    .replaceAll('10kg�?0kg', '10kg-20kg')
    .replaceAll('set �?rigid', 'set — rigid')
    .replaceAll('Â·', '·')
    .replaceAll('â€“', '–')
    .replaceAll('â€”', '—')
    .replaceAll('â€™', '’')
    .replaceAll('â€œ', '“')
    .replaceAll('â€', '”');
}
function extractBody(html, result) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m ? m[1] : html;
  body = stripDuplicateBodyAssets(body);
  body = repairCorruptedLogoMarkup(body);
  body = repairVisibleMojibake(body);
  return result?.source === 'r2' ? rewriteRemoteImageUrls(body, result.sourceUrl) : body;
}

function normalizeHomepageSemanticH1(bodyHtml, rel) {
  if (rel !== 'index.html') return bodyHtml;
  let seen = 0;
  return bodyHtml.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi, (all, attrs, content) => {
    seen += 1;
    if (seen === 1) return all;
    return `<h2${attrs}>${content}</h2>`;
  });
}
async function localDetailParams(directory) {
  const dir = safeResolve(directory);
  if (!dir) return [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
      .map(entry => ({ path: [directory, entry.name] }));
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  // Core pages, static SEO category hubs and industry solution pages are prebuilt.
  // Local detail pages are also prebuilt so crawlers receive a warm static response on first visit.
  // dynamicParams remains enabled for future R2/CMS detail pages that are not in this build.
  const coreParams = [
    { path: [] },
    { path: ['index.html'] },
    { path: ['products.html'] },
    { path: ['about.html'] },
    { path: ['blog.html'] },
    { path: ['news.html'] },
    { path: ['contact.html'] },
    { path: ['procurement-guides.html'] },
    { path: ['custom-packaging-boxes.html'] },
    { path: ['custom-gift-boxes.html'] },
    { path: ['custom-magnetic-gift-boxes.html'] },
    { path: ['custom-stand-up-pouches.html'] },
    { path: ['custom-coffee-bags-with-valve.html'] },
    { path: ['custom-pharmaceutical-packaging-boxes.html'] },
    { path: ['custom-cosmetic-packaging-boxes.html'] },
    { path: ['custom-food-packaging.html'] },
    { path: ['custom-paper-bags.html'] },
    { path: ['custom-labels-and-stickers.html'] },
    { path: ['industry', 'cosmetic-packaging-solutions.html'] },
    { path: ['industry', 'food-and-restaurant-packaging-solutions.html'] },
    { path: ['industry', 'pharmaceutical-medical-packaging-solutions.html'] },
    { path: ['industry', 'coffee-tea-packaging-solutions.html'] },
    { path: ['industry', 'pet-food-packaging-solutions.html'] },
    { path: ['industry', 'cannabis-packaging-solutions.html'] },
    { path: ['industry', 'ecommerce-mailer-packaging-solutions.html'] },
    { path: ['industry', 'luxury-gift-packaging-solutions.html'] }
  ];
  const detailParams = (
    await Promise.all(['products', 'blog', 'news', 'industry'].map(localDetailParams))
  ).flat();
  const seen = new Set();
  return [...coreParams, ...detailParams].filter(item => {
    const key = (item.path || []).join('/');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export async function generateMetadata({ params }) {
  const result = await loadHtml(params);
  const { html, rel, sourceUrl } = result;
  const title = seoTitleForRel(getTitle(html, rel), rel);
  const description = seoDescriptionForRel(getDescription(html, rel), rel);
  const canonical = getCanonical(html, rel, sourceUrl);
  const image = getOgImage(html, sourceUrl);
  const isProduct = rel.startsWith('products/');
  const isArticle = rel.startsWith('blog/') || rel.startsWith('news/');
  const publishedTime = getMeta(html, 'property', 'article:published_time') || undefined;
  const modifiedTime = getMeta(html, 'property', 'article:modified_time') || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: { title, description, url: canonical, siteName: 'Packaging Factory Direct', type: isArticle ? 'article' : 'website', images: [{ url: image }], publishedTime, modifiedTime },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    other: { 'x-pfd-content-source': result.source, 'x-pfd-isr-tags': cacheTagsForRel(rel).join(',') }
  };
}
function firstImageAbsoluteUrl(html, sourceUrl) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (og && og[1]) return normalizeImageSrc(og[1].trim(), sourceUrl || SITE_URL + '/');
  const gm = html.match(/<div[^>]*class=["'][^"']*gallery-main[^"']*["'][^>]*>[\s\S]*?<img[^>]*\bsrc=["']([^"']+)["']/i);
  if (gm && gm[1]) {
    const raw = gm[1].trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const clean = raw.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
    return SITE_URL + (clean.startsWith('/') ? clean : '/' + clean);
  }
  const anyImg = html.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (anyImg && anyImg[1]) {
    const raw = anyImg[1].trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const clean = raw.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
    return SITE_URL + (clean.startsWith('/') ? clean : '/' + clean);
  }
  return `${SITE_URL}/assets/img/hero/hero-1.webp`;
}

function firstParagraphText(html) {
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!p) return '';
  return repairTextEncoding(p[1].replace(/<[^>]+>/g, '')).slice(0, 500);
}

function firstVisibleText(html, pattern) {
  const match = html.match(pattern);
  return match ? repairTextEncoding(match[1].replace(/<[^>]+>/g, ' ')) : '';
}

function productPropertiesFromTable(html) {
  return Array.from(html.matchAll(/<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi))
    .slice(0, 12)
    .map(match => ({
      '@type': 'PropertyValue',
      name: repairTextEncoding(match[1].replace(/<[^>]+>/g, ' ')),
      value: repairTextEncoding(match[2].replace(/<[^>]+>/g, ' '))
    }))
    .filter(item => item.name && item.value);
}

function productAndRfqServiceJsonLd(html, rel, title, description, sourceUrl) {
  const image = firstImageAbsoluteUrl(html, sourceUrl);
  const cleanName = firstVisibleText(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
    || repairTextEncoding(title.replace(/\s*\|\s*.+$/, ''));
  const productDescription = firstParagraphText(html) || repairTextEncoding(description);
  const category = firstVisibleText(html, /<div\b[^>]*class=["'][^"']*\beyebrow\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    || 'Custom Packaging';
  const additionalProperty = productPropertiesFromTable(html);
  const pageUrl = `${SITE_URL}/${rel}`;
  const webpageId = `${pageUrl}#webpage`;
  const productId = `${pageUrl}#product`;
  const serviceId = `${pageUrl}#service`;
  const imageId = `${pageUrl}#primaryimage`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': webpageId,
        url: pageUrl,
        name: seoTitleForRel(title, rel),
        description: seoDescriptionForRel(description, rel),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          '@id': imageId,
          url: image,
          contentUrl: image
        },
        mainEntity: { '@id': productId }
      },
      {
        '@type': 'Product',
        '@id': productId,
        name: cleanName,
        url: pageUrl,
        image: [image],
        description: productDescription,
        category,
        brand: { '@type': 'Brand', name: 'Packaging Factory Direct' },
        manufacturer: { '@id': `${SITE_URL}/#organization` },
        audience: {
          '@type': 'BusinessAudience',
          audienceType: 'B2B packaging buyers, brand owners and procurement teams'
        },
        ...(additionalProperty.length ? { additionalProperty } : {}),
        subjectOf: { '@id': serviceId }
      },
      {
        '@type': 'Service',
        '@id': serviceId,
        name: `Custom manufacturing service for ${cleanName}`,
        serviceType: 'Custom packaging manufacturing and printing',
        description,
        url: pageUrl,
        image: { '@id': imageId },
        provider: { '@id': `${SITE_URL}/#organization` },
        isRelatedTo: { '@id': productId },
        areaServed: 'Worldwide',
        audience: {
          '@type': 'BusinessAudience',
          audienceType: 'B2B packaging buyers, brand owners and procurement teams'
        },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SITE_URL}/contact.html`,
          servicePhone: {
            '@type': 'ContactPoint',
            contactType: 'sales',
            name: 'Linda Wang',
            email: 'linda@colorprintingpackage.com',
            telephone: '+86-181-6573-0353',
            availableLanguage: ['en', 'zh']
          }
        }
      }
    ]
  };
}

function findArticleDates(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findArticleDates(item);
      if (found) return found;
    }
    return null;
  }
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some(type => ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle'].includes(type))) {
    return {
      published: value.datePublished || '',
      modified: value.dateModified || value.datePublished || ''
    };
  }
  if (Array.isArray(value['@graph'])) return findArticleDates(value['@graph']);
  return null;
}

const SOURCE_CONTROLLED_ARTICLE_DATES = {
  '2026-07-05T00:21:34+08:00': new Set([
    'blog/custom-cannabis-mylar-bags-guide.html',
    'blog/custom-paper-box-material-guide.html',
    'blog/gs1-datamatrix-pharma-packaging-guide.html',
    'blog/mopp-vmpet-pe-flexible-packaging-guide.html',
    'news/california-cannabis-packaging-child-resistant.html',
    'news/new-york-cannabis-packaging-labeling.html',
    'news/paper-packaging-sustainable-retail-branding.html',
    'news/pharma-serialization-packaging-demand.html'
  ]),
  '2026-07-05T16:08:24+08:00': new Set([
    'blog/coffee-bag-with-valve-guide.html',
    'blog/cosmetic-packaging-box-guide.html',
    'blog/custom-packaging-moq-500-pcs-guide.html',
    'blog/custom-packaging-sample-process-guide.html',
    'blog/custom-packaging-rfq-checklist.html',
    'blog/food-packaging-material-guide.html',
    'blog/gift-box-insert-guide.html',
    'blog/pharma-packaging-serialization-guide.html',
    'blog/shipping-and-packaging-lead-time-guide.html',
    'blog/stand-up-pouch-material-structure-guide.html'
  ]),
  '2026-08-09T19:45:50+08:00': new Set([
    'blog/beauty-pr-kit-packaging-specification-guide.html',
    'blog/china-custom-packaging-supplier-audit-evidence-checklist.html',
    'blog/dermal-filler-secondary-packaging-rfq-guide.html',
    'blog/flexible-pouch-barrier-otr-wvtr-rfq-guide.html'
  ]),
  '2026-08-10T02:17:14+08:00': new Set([
    'blog/custom-packaging-landed-cost-dimensional-weight-moq-guide.html',
    'blog/ecommerce-packaging-transit-test-ista-3a-mailer-box-guide.html',
    'blog/food-pouch-odor-migration-food-contact-document-checklist.html',
    'blog/packaging-color-matching-pantone-cmyk-delta-e-proof-guide.html'
  ])
};

function sourceControlledArticleDates(rel) {
  for (const [date, paths] of Object.entries(SOURCE_CONTROLLED_ARTICLE_DATES)) {
    if (paths.has(rel)) return { published: date, modified: date };
  }
  return { published: '', modified: '' };
}

function articleDatesFromHtml(html, rel) {
  const metaPublished = getMeta(html, 'property', 'article:published_time');
  const metaModified = getMeta(html, 'property', 'article:modified_time');
  if (metaPublished) return { published: metaPublished, modified: metaModified || metaPublished };
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const dates = findArticleDates(JSON.parse(match[1]));
      if (dates?.published) return dates;
    } catch {}
  }
  const time = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  return time ? { published: time[1], modified: time[1] } : sourceControlledArticleDates(rel);
}

function enrichInlineArticleSchemas(bodyHtml, rel) {
  const dates = articleDatesFromHtml(bodyHtml, rel);
  if (!dates.published) return bodyHtml;
  return bodyHtml.replace(
    /(<script[^>]+type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (all, open, json, close) => {
      try {
        const parsed = JSON.parse(json);
        let changed = false;
        const visit = value => {
          if (Array.isArray(value)) return value.forEach(visit);
          if (!value || typeof value !== 'object') return;
          const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
          if (types.some(type => ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle'].includes(type))) {
            if (!value.datePublished) {
              value.datePublished = dates.published;
              changed = true;
            }
            if (!value.dateModified) {
              value.dateModified = dates.modified || dates.published;
              changed = true;
            }
          }
          Object.values(value).forEach(visit);
        };
        visit(parsed);
        return changed ? `${open}${JSON.stringify(parsed)}${close}` : all;
      } catch {
        return all;
      }
    }
  );
}

function articleJsonLd(html, rel, title, description, sourceUrl) {
  const image = firstImageAbsoluteUrl(html, sourceUrl);
  const { published: publishedTime, modified: modifiedTime } = articleDatesFromHtml(html, rel);
  const isNews = rel.startsWith('news/');
  const fullHeadline = firstVisibleText(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
    || repairTextEncoding(title.replace(/\s*\|\s*.+$/, ''));
  return {
    '@context': 'https://schema.org',
    '@type': isNews ? 'NewsArticle' : 'Article',
    headline: shortenAtWordBoundary(fullHeadline, 110),
    description: seoDescriptionForRel(description, rel),
    image: [image],
    articleSection: isNews ? 'Packaging Industry News' : 'Custom Packaging Buyer Guide',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/${rel}` },
    author: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Packaging Factory Direct',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` }
    },
    ...(publishedTime ? { datePublished: publishedTime } : {}),
    ...(modifiedTime || publishedTime ? { dateModified: modifiedTime || publishedTime } : {})
  };
}

const TRUST_PAGES = {
  'factory-capability.html': {
    name: 'Factory Capability',
    about: 'Factory-direct custom packaging manufacturing capability for B2B buyers, including structure, material, printing, finishing and OEM/ODM production support.'
  },
  'quality-control.html': {
    name: 'Quality Control',
    about: 'Custom packaging quality control process covering material checks, printing inspection, dieline confirmation, finishing review and pre-shipment checks.'
  },
  'sample-process.html': {
    name: 'Sample Process',
    about: 'Custom packaging sample process for B2B buyers, including dieline review, artwork check, sample confirmation and mass production approval.'
  },
  'shipping.html': {
    name: 'Shipping and Lead Time',
    about: 'Worldwide shipping, carton packing, export delivery and lead time guidance for custom packaging orders.'
  },
  'moq-policy.html': {
    name: 'MOQ Policy',
    about: 'MOQ 500 PCS policy for custom boxes, bags, pouches, labels and paper printing orders from Packaging Factory Direct.'
  },
  'artwork-guidelines.html': {
    name: 'Artwork Guidelines',
    about: 'Artwork, dieline, color, bleed, font and prepress requirements for custom packaging RFQ and production.'
  }
};

const REVIEW_DATE = '2026-08-07';
const CATEGORY_REVIEW = {
  'custom-packaging-boxes.html': [
    ['ISO 12647-2 offset print process reference', 'https://www.iso.org/standard/57833.html'],
    ['ISO 18601 packaging and environment reference', 'https://www.iso.org/standard/55869.html']
  ],
  'custom-gift-boxes.html': [
    ['ISO 12647-2 offset print process reference', 'https://www.iso.org/standard/57833.html'],
    ['ISO 18601 packaging and environment reference', 'https://www.iso.org/standard/55869.html']
  ],
  'custom-stand-up-pouches.html': [
    ['FDA Packaging & Food Contact Substances', 'https://www.fda.gov/food/food-ingredients-packaging/packaging-food-contact-substances-fcs'],
    ['European Commission Food Contact Materials', 'https://food.ec.europa.eu/food-safety/chemical-safety/food-contact-materials_en']
  ],
  'custom-cosmetic-packaging-boxes.html': [
    ['FDA Cosmetics Labeling', 'https://www.fda.gov/cosmetics/cosmetics-labeling'],
    ['ISO 12647-2 offset print process reference', 'https://www.iso.org/standard/57833.html']
  ],
  'custom-pharmaceutical-packaging-boxes.html': [
    ['GS1 2D barcodes in healthcare', 'https://www.gs1.org/industries/healthcare/2d-barcode-healthcare'],
    ['FDA Drug Supply Chain Security Act', 'https://www.fda.gov/drugs/drug-supply-chain-security-act-dscsa/title-ii-drug-quality-and-security-act']
  ]
};

function categoryFaqJsonLd(html, rel) {
  if (!CATEGORY_REVIEW[rel]) return null;
  const faqStart = html.search(/<h2[^>]*>\s*(?:Frequently asked questions|Buyer FAQ|FAQ)\s*<\/h2>/i);
  if (faqStart < 0) return null;
  const faqEnd = html.indexOf('</section>', faqStart);
  const faqRegion = html.slice(faqStart, faqEnd >= 0 ? faqEnd : undefined);
  const pairs = Array.from(faqRegion.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map(match => ({
      question: match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      answer: match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }))
    .filter(item => item.question && item.answer)
    .slice(0, 8);
  if (pairs.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

function categoryReviewSection(rel) {
  const sources = CATEGORY_REVIEW[rel];
  if (!sources) return '';
  const links = sources.map(([label, url]) => `<li><a href="${url}" rel="noopener noreferrer">${label}</a></li>`).join('');
  return `<section class="section" data-injected="content-review"><div class="container"><h2>Content Review and Primary Sources</h2><p><strong>Content owner:</strong> Packaging Factory Direct. <strong>Last reviewed:</strong> <time datetime="${REVIEW_DATE}">August 7, 2026</time>.</p><ul>${links}</ul><p>These sources are buyer-side specification references, not claims that Packaging Factory Direct holds a certification. Project compliance and supporting documents must be verified for the selected material, production route and destination market before ordering.</p></div></section>`;
}

function sanitizeUnverifiedClaims(html) {
  const replacements = [
    ["<h3>Global Compliance</h3><p>FSC, ISO, BRC, GMP and GS1 serialization solutions available.</p>", "<h3>Project-Specific Compliance</h3><p>Material documentation, print controls and serialization options are reviewed against each project's destination-market requirements.</p>"],
    ["China's Leading One-Stop Custom Packaging Solutions", 'One-Stop Custom Packaging Solutions'],
    ['ISO Print Quality', 'Print Quality Controls'],
    ['Food-grade paper and coating (FDA/EU 1935/2004 compliant)', 'Paper and coating selected against the documented food-contact requirements for the intended use and destination market'],
    ['Food-grade / FDA / EU 1935/2004 material certificate check for food and pharma packaging', 'Project-specific material and food-contact documentation check for the intended use and destination market'],
    ['<h2>Certifications & Compliance</h2><p>We support FSC, ISO 9001, FDA-compliant food-grade material, EU 1935/2004 food contact, REACH, GS1 DataMatrix / pharma serialization and buyer-requested third-party inspection (SGS, BV, Intertek) on RFQ.</p>', '<h2>Project-Specific Compliance Review</h2><p>FSC, ISO 9001, food-contact, REACH, GS1 DataMatrix and third-party inspection references are included only when supported by verified documents for the selected supplier, material, production route and destination market.</p>'],
    ['Food-grade material certificate included', 'Supporting documentation confirmed per selected material and destination market'],
    ['Yes. We use FDA-compliant and EU 1935/2004 food-contact certified paper, coating and film for food packaging, coffee bags with valve, restaurant takeaway boxes and grease-resistant liners. Certificates provided on request.', 'Food-contact suitability is project-specific. Confirm the food type, contact conditions and destination market before material selection; supporting documents are included only when verified for the selected material and production route.'],
    ['Yes. Commercial invoice, packing list, certificate of origin, FSC certificate (for FSC-paper orders), FDA/EU 1935/2004 food-grade certificate, ISO 9001 certificate, MSDS and REACH declaration all available on request.', 'Commercial invoice and packing list are provided for confirmed orders. Certificates, declarations and country-of-origin documents are included only when applicable and verified for the selected material, supplier, production route and destination market.'],
    ['Stand-up pouch with certified child-resistant zipper and bottom gusset', 'Stand-up pouch with a project-specified child-resistant zipper and bottom gusset; destination-market test evidence must be confirmed before ordering']
  ];
  return replacements.reduce((output, [from, to]) => output.replaceAll(from, to), html);
}

function collectionPageJsonLd(html, rel, title, description) {
  if (getKindFromRel(rel) !== 'category') return null;
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']*\/products\/[^"']+\.html|[^"']*products\/[^"']+\.html|[^"']*\.html)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((m) => {
      const href = new URL(m[1], `${SITE_URL}/${rel}`).pathname;
      if (!href.startsWith('/products/') || !href.endsWith('.html')) return null;
      const name = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        '@type': 'ListItem',
        position: 0,
        url: href.startsWith('http') ? href : `${SITE_URL}${href.startsWith('/') ? href : `/${href}`}`,
        name: name || href.split('/').pop().replace(/\.html$/i, '').replace(/-/g, ' ')
      };
    })
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const item of links) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push({ ...item, position: unique.length + 1 });
    if (unique.length >= 24) break;
  }
  const reviewSources = CATEGORY_REVIEW[rel] || [];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: title.replace(/\s*\|\s*.+$/, '').trim(),
        description,
        url: `${SITE_URL}/${rel}`,
        about: 'B2B custom packaging category page for OEM/ODM buyers, brands, importers and distributors.',
        isPartOf: { '@type': 'WebSite', name: 'Packaging Factory Direct', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
        ...(reviewSources.length ? {
          author: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
          dateModified: REVIEW_DATE,
          citation: reviewSources.map(([, url]) => url)
        } : {})
      },
      {
        '@type': 'ItemList',
        name: `${title.replace(/\s*\|\s*.+$/, '').trim()} product list`,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        numberOfItems: unique.length,
        itemListElement: unique
      }
    ]
  };
}

function trustPageJsonLd(rel, title, description) {
  const meta = TRUST_PAGES[rel];
  if (!meta) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title.replace(/\s*\|\s*.+$/, '').trim() || meta.name,
    description: description || meta.about,
    url: `${SITE_URL}/${rel}`,
    about: meta.about,
    isPartOf: { '@type': 'WebSite', name: 'Packaging Factory Direct', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL }
  };
}

function faqPageJsonLd(rel) {
  if (rel !== 'faq.html') return null;
  const questions = [
    ['What is the MOQ for custom packaging?', 'MOQ starts from 500 PCS for custom packaging orders, including boxes, bags, pouches, labels and printed paper packaging.'],
    ['How do I request a custom packaging quote?', 'Send product size, quantity, material, printing colors, finish, destination country and artwork file through the contact form, email or WhatsApp.'],
    ['Can you make custom size packaging?', 'Yes. Packaging Factory Direct supports custom size, custom structure, custom dieline and OEM/ODM packaging production.'],
    ['Do you support OEM/ODM packaging?', 'Yes. OEM and ODM custom packaging is supported for B2B buyers, brands, importers, distributors and ecommerce sellers.'],
    ['How long does sampling take?', 'Sampling time depends on structure, material and finish. A dieline and artwork check is recommended before sample production.']
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  };
}

function hasInlineJsonLdOfType(html, type) {
  const re = new RegExp(`<script[^>]+application/ld\\+json[^>]*>([\\s\\S]*?)</script>`, 'gi');
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] || '').trim();
    if (!raw) continue;
    const normalized = raw.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;/g, "'");
    try {
      const parsed = JSON.parse(normalized);
      if (jsonLdContainsType(parsed, type)) return true;
    } catch {
      const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactDouble = new RegExp(`"@type"\\s*:\\s*(?:\\[[^\\]]*)?"${escapedType}"`, 'i');
      const exactSingle = new RegExp(`'@type'\\s*:\\s*(?:\\[[^\\]]*)?'${escapedType}'`, 'i');
      if (exactDouble.test(normalized) || exactSingle.test(normalized)) return true;
    }
  }
  return false;
}

function jsonLdContainsType(value, type) {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(item => jsonLdContainsType(item, type));
  if (typeof value !== 'object') return false;
  const ownType = value['@type'];
  if (ownType === type) return true;
  if (Array.isArray(ownType) && ownType.includes(type)) return true;
  if (Array.isArray(value['@graph']) && value['@graph'].some(item => jsonLdContainsType(item, type))) return true;
  return false;
}

function breadcrumbJsonLd(rel) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` }];
  if (rel === 'index.html' || !rel) return null;
  const kind = getKindFromRel(rel);
  const slugText = slugFromRel(rel).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (kind === 'products' && rel !== 'products.html') {
    items.push({ '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else if (kind === 'blog' && rel !== 'blog.html') {
    items.push({ '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else if (kind === 'news' && rel !== 'news.html') {
    items.push({ '@type': 'ListItem', position: 2, name: 'News', item: `${SITE_URL}/news.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else if (kind === 'industry') {
    items.push({ '@type': 'ListItem', position: 2, name: 'Industry Solutions', item: `${SITE_URL}/products.html` });
    items.push({ '@type': 'ListItem', position: 3, name: slugText, item: `${SITE_URL}/${rel}` });
  } else {
    const label = rel === 'products.html' ? 'Products'
      : rel === 'blog.html' ? 'Blog'
      : rel === 'news.html' ? 'News'
      : rel === 'about.html' ? 'About Us'
      : rel === 'contact.html' ? 'Contact'
      : slugText;
    items.push({ '@type': 'ListItem', position: 2, name: label, item: `${SITE_URL}/${rel}` });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function buyerGuideSection(kind, rel) {
  // Additive-only buyer guide links, rendered AFTER the original body.
  // Never appears on: homepage (index.html), products list, blog list, news list, or the 7 trust pages themselves.
  // Product detail: append a compact buyer-guide box.
  // Blog/news detail: append related product-category shortcuts + buyer-guide links.
  const TRUST_LINKS = [
    ['/procurement-guides.html', 'Packaging Procurement Guides'],
    ['/factory-capability.html', 'Factory Capability'],
    ['/quality-control.html', 'Quality Control'],
    ['/sample-process.html', 'Sample Process'],
    ['/artwork-guidelines.html', 'Artwork Guidelines'],
    ['/moq-policy.html', 'MOQ Policy'],
    ['/shipping.html', 'Shipping & Packing'],
    ['/faq.html', 'Buyer FAQ']
  ];
  const CATEGORY_LINKS = [
    ['/custom-packaging-boxes.html', 'Custom Packaging Boxes'],
    ['/custom-gift-boxes.html', 'Custom Gift Boxes'],
    ['/custom-magnetic-gift-boxes.html', 'Custom Magnetic Gift Boxes'],
    ['/custom-stand-up-pouches.html', 'Custom Stand Up Pouches'],
    ['/custom-coffee-bags-with-valve.html', 'Custom Coffee Bags with Valve'],
    ['/custom-pharmaceutical-packaging-boxes.html', 'Custom Pharmaceutical Packaging Boxes'],
    ['/custom-cosmetic-packaging-boxes.html', 'Custom Cosmetic Packaging Boxes'],
    ['/custom-food-packaging.html', 'Custom Food Packaging'],
    ['/custom-paper-bags.html', 'Custom Paper Bags'],
    ['/custom-labels-and-stickers.html', 'Custom Labels and Stickers']
  ];
  const trustLis = TRUST_LINKS.map(([u,t]) => `<li><a href="${u}">${t}</a></li>`).join('');
  const catLis = CATEGORY_LINKS.map(([u,t]) => `<li><a href="${u}">${t}</a></li>`).join('');

  // Product detail: only trust links (categories link back would be redundant here since related products already shown)
  if (kind === 'products' && rel !== 'products.html') {
    return `<section class="section" data-injected="buyer-guide"><div class="container"><h2>What to Send for Quotation</h2><p>For a fast factory-direct RFQ, send product size, order quantity, material, printing colors, finish, destination country and artwork file. MOQ 500 PCS. OEM/ODM custom size packaging is supported.</p><ul><li>Product size and structure or reference photo</li><li>Quantity and target delivery country</li><li>Material, thickness and application industry</li><li>Printing colors, logo file and artwork format</li><li>Finish request: matte, gloss, foil, embossing, spot UV, window or insert</li></ul><h2>Materials, Processes and Applications</h2><p>Common custom packaging options include greyboard, kraft paper, corrugated board, coated paperboard, specialty paper and laminated flexible film. Printing and finishing can include CMYK, Pantone matching, foil stamping, embossing, debossing, spot UV, matte or gloss lamination, soft-touch coating, windows and inserts.</p><ul><li>Applications: retail display, ecommerce shipping, gift sets, food, cosmetics, pharma, coffee, apparel and promotional packaging</li><li>Sample process: dieline review, artwork check, material confirmation, sample approval and mass production setup</li><li>Shipping notes: confirm carton packing, destination country, delivery method and lead-time target before production</li></ul><h2>Related RFQ FAQ</h2><dl><dt>What is the MOQ?</dt><dd>MOQ starts from 500 PCS for custom packaging orders.</dd><dt>Can you make custom size and structure?</dt><dd>Yes. OEM/ODM custom size, dieline and structure are supported after artwork and material review.</dd><dt>What affects quotation speed?</dt><dd>Size, quantity, material, printing colors, finish, destination country and artwork file are the key RFQ fields.</dd><dt>Can I approve a sample before mass production?</dt><dd>Yes. Buyers can confirm dieline, artwork, material and sample before production setup.</dd></dl><h2>Buyer-Guide Pages</h2><p>Complete B2B buyer resources: factory capability, quality control, sample process, MOQ, artwork, shipping and FAQ.</p><ul>${trustLis}</ul><h2>Related Product Categories</h2><ul>${catLis}</ul></div></section>`;
  }
  // Blog/news detail: trust links + category shortcuts to relevant products
  if ((kind === 'blog' || kind === 'news') && rel !== 'blog.html' && rel !== 'news.html') {
    return `<section class="section" data-injected="buyer-guide"><div class="container"><h2>Related Custom Packaging Categories</h2><ul>${catLis}</ul><h2>Buyer-Guide Pages</h2><ul>${trustLis}</ul></div></section>`;
  }
  return '';
}

export default async function HtmlPage({ params }) {
  const result = await loadHtml(params);
  const { html, rel, sourceUrl } = result;
  const bc = breadcrumbJsonLd(rel);
  const kind = getKindFromRel(rel);
  const title = getTitle(html, rel);
  const description = getDescription(html, rel);
  const bodyHtml = enrichInlineArticleSchemas(
    sanitizeUnverifiedClaims(normalizeHomepageSemanticH1(extractBody(html, result), rel)),
    rel
  );
  const buyerGuide = buyerGuideSection(kind, rel);
  const contentReview = categoryReviewSection(rel);
  const trustSchema = trustPageJsonLd(rel, title, description);
  const faqSchema = faqPageJsonLd(rel);
  const categoryFaqSchema = categoryFaqJsonLd(bodyHtml, rel);
  const collectionSchema = collectionPageJsonLd(html, rel, title, description);

  // Original static <head> content is not rendered inside the extracted body,
  // so SEO schemas are injected here at the App Router layer.
  const injectProductService = kind === 'products' && rel !== 'products.html';
  const articleType = kind === 'news' ? 'NewsArticle' : 'Article';
  const injectArticle = (kind === 'blog' || kind === 'news') && rel !== 'blog.html' && rel !== 'news.html' && !hasInlineJsonLdOfType(bodyHtml, articleType);
  const injectTrust = Boolean(trustSchema);
  const injectFaq = Boolean(faqSchema || categoryFaqSchema);
  const injectCollection = Boolean(collectionSchema);
  const productsLoaderScript = rel === 'products.html' ? productListLoaderScriptForRenderedUrls() : '';

  return (
    <>
      {rel === 'products.html' ? (
        <style>{`@supports (content-visibility:auto){.filters ~ .grid > .product-card:nth-child(n+13){content-visibility:auto;contain-intrinsic-size:auto 470px}}`}</style>
      ) : null}
      {bc ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bc) }}
        />
      ) : null}
      {injectProductService ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productAndRfqServiceJsonLd(html, rel, title, description, sourceUrl)) }}
        />
      ) : null}
      {injectArticle ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(html, rel, title, description, sourceUrl)) }}
        />
      ) : null}
      {injectTrust ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(trustSchema) }}
        />
      ) : null}
      {injectFaq ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema || categoryFaqSchema) }}
        />
      ) : null}
      {injectCollection ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      ) : null}
      <main dangerouslySetInnerHTML={{ __html: bodyHtml + contentReview + buyerGuide }} />
      {productsLoaderScript ? (
        <script dangerouslySetInnerHTML={{ __html: productsLoaderScript.replace(/^<script>|<\/script>$/g, '') }} />
      ) : null}
    </>
  );
}
