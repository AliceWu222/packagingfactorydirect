import fs from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';

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
async function readProductCaseEvidence(rel) {
  if (!rel || !rel.startsWith('products/')) return null;
  const file = safeResolve('data/product-case-evidence.json');
  if (!file) return null;
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  if (!text) return null;
  try {
    const json = JSON.parse(text);
    return json?.cases?.[slugFromRel(rel)] || null;
  } catch {
    return null;
  }
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
  return `<script id="pfd-products-rendered" type="application/json">${payload}</script><script>(function(){var done=false;function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}function abs(u){u=String(u||'');if(!u)return '';if(/^https?:\/\//i.test(u))return u;if(u.charAt(0)==='/')return u;return '/'+u.replace(/^\.\//,'');}function card(p){var href=abs(p.url||'');var title=esc(p.title||'');var desc=esc(p.description||'');var cat=esc(p.category||'OEM & Customize');var img=p.image?'<img alt="'+title+'" decoding="async" loading="lazy" fetchpriority="low" width="800" height="800" src="'+esc(abs(p.image))+'"/>':'';var search=esc([p.title,p.description,p.category,(p.buyerIntentKeywords||[]).join(' ')].filter(Boolean).join(' '));return '<article class="product-card remote-r2-card" data-search="'+search+'"><a href="'+esc(href)+'">'+img+'<div class="card-body"><span class="tag">'+cat+'</span><h3>'+title+'</h3><p>'+desc+'</p></div></a></article>';}
function load(){if(done)return;done=true;var grid=document.querySelector('.grid');var state=document.getElementById('pfd-products-rendered');if(!grid||!state)return;var rendered=[];try{rendered=JSON.parse(state.textContent||'{}').renderedUrls||[];}catch(e){}var seen=new Set(rendered.map(function(u){return abs(u).toLowerCase();}));fetch('/product-feed.json',{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(data){var products=(data&&data.products)||[];var html='';products.forEach(function(p){var href=abs(p.url||'');var key=href.toLowerCase();if(!href||seen.has(key))return;seen.add(key);html+=card(p);});if(html){grid.insertAdjacentHTML('beforeend',html);document.dispatchEvent(new CustomEvent('pfd:products-loaded'));}state.remove();}).catch(function(){});}if('requestIdleCallback'in window){requestIdleCallback(load,{timeout:1800});}else{setTimeout(load,900);}window.addEventListener('scroll',load,{once:true,passive:true});window.addEventListener('mousemove',load,{once:true,passive:true});})();</script>`;
}
function productListLoaderScriptForRenderedUrls() {
  return `<script>(function(){var done=false;function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}function abs(u){u=String(u||'');if(!u)return '';if(/^https?:\/\//i.test(u))return u;if(u.charAt(0)==='/')return u;return '/'+u.replace(/^\.\//,'');}function card(p){var href=abs(p.url||'');var title=esc(p.title||'');var desc=esc(p.description||'');var cat=esc(p.category||'OEM & Customize');var img=p.image?'<img alt="'+title+'" decoding="async" loading="lazy" fetchpriority="low" width="800" height="800" src="'+esc(abs(p.image))+'"/>':'';var search=esc([p.title,p.description,p.category,(p.buyerIntentKeywords||[]).join(' ')].filter(Boolean).join(' '));return '<article class="product-card remote-r2-card" data-search="'+search+'"><a href="'+esc(href)+'">'+img+'<div class="card-body"><span class="tag">'+cat+'</span><h3>'+title+'</h3><p>'+desc+'</p></div></a></article>';}
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
function optimizeListingOutputHtml(html, rel) {
  if (rel === 'products.html') return trimProductListingHtml(html);
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
    const imgHtml = image ? `<img alt="${title}" decoding="async" loading="lazy" fetchpriority="low" width="800" height="800" src="${htmlEscape(image)}"/>` : '';
    return `<article class="product-card remote-r2-card" data-search="${search}"><a href="${htmlEscape(href)}">${imgHtml}<div class="card-body"><span class="tag">${category}</span><h3>${title}</h3><p>${desc}</p></div></a></article>`;
  }

  return `<article class="card remote-r2-card"><div class="card-body"><span class="tag">${category}</span><h3><a href="${htmlEscape(href)}">${title}</a></h3><p>${desc}</p></div></article>`;
}
async function augmentListingHtml(html, rel) {
  const kind = rel === 'products.html' ? 'products' : rel === 'blog.html' ? 'blog' : rel === 'news.html' ? 'news' : null;
  if (!kind) return html;

  const items = dedupeManifestItems(await fetchRemoteManifest(kind).catch(() => []), kind);
  if (!items.length) return html;

  const newItems = items.filter(item => !html.includes(`href="${normalizeRootHref(item.url, kind)}"`) && !html.includes(`href="${item.url}"`));
  const initialItems = kind === 'products' ? newItems.slice(0, PRODUCT_LIST_INITIAL_RENDER_LIMIT) : newItems;
  const cards = initialItems
    .map(item => cardForItem(item, kind, manifestUrlFor(kind)))
    .join('');

  const deferred = productListLoaderScript(newItems, kind);
  if (!cards && !deferred) return html;

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
function getTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : 'Packaging Factory Direct';
}
function getDescription(html, rel) {
  // Runtime descriptions intentionally override older static meta on strategic pages.
  const kind = getKindFromRel(rel);
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
function addMissingImgAttr(tag, name, value) {
  if (new RegExp(`\\s${name}=`, 'i').test(tag)) return tag;
  return tag.replace(/<img\b/i, `<img ${name}="${value}"`);
}
function enhanceImagePerformance(bodyHtml, rel) {
  if (!rel.startsWith('products/') && rel !== 'products.html') return bodyHtml;
  let imageIndex = 0;
  return bodyHtml.replace(/<img\b[^>]*>/gi, (tag) => {
    imageIndex += 1;
    let out = tag;
    out = addMissingImgAttr(out, 'decoding', 'async');
    out = addMissingImgAttr(out, 'width', '800');
    out = addMissingImgAttr(out, 'height', '800');
    if (rel.startsWith('products/')) {
      out = addMissingImgAttr(out, 'loading', imageIndex === 1 ? 'eager' : 'lazy');
      out = addMissingImgAttr(out, 'fetchpriority', imageIndex === 1 ? 'high' : 'low');
    } else {
      out = addMissingImgAttr(out, 'loading', imageIndex <= 4 ? 'eager' : 'lazy');
      out = addMissingImgAttr(out, 'fetchpriority', imageIndex <= 4 ? 'high' : 'low');
    }
    return out;
  });
}
function extractBody(html, result) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m ? m[1] : html;
  body = stripDuplicateBodyAssets(body);
  body = repairCorruptedLogoMarkup(body);
  body = enhanceImagePerformance(body, result?.rel || '');
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
export async function generateStaticParams() {
  // Core pages, static SEO category hubs and industry solution pages are prebuilt.
  // Product/blog/news detail pages are still ISR-generated per path to avoid full catalog rebuilds.
  return [
    { path: [] },
    { path: ['index.html'] },
    { path: ['products.html'] },
    { path: ['about.html'] },
    { path: ['blog.html'] },
    { path: ['news.html'] },
    { path: ['contact.html'] },
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
}
export async function generateMetadata({ params }) {
  const result = await loadHtml(params);
  const { html, rel, sourceUrl } = result;
  const title = getTitle(html);
  const description = getDescription(html, rel);
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
  return p[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function productJsonLd(html, rel, title, description, sourceUrl) {
  const image = firstImageAbsoluteUrl(html, sourceUrl);
  const cleanName = title.replace(/\s*\|\s*.+$/, '').trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanName,
    description: description,
    image: image,
    brand: { '@type': 'Brand', name: 'Packaging Factory Direct' },
    manufacturer: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
    category: 'Custom Packaging',
    material: 'Greyboard, art paper, kraft paper, corrugated board, PET/PLA film, laminated flexible packaging materials, foil and specialty paper depending on product application',
    printingOptions: ['Offset printing', 'Digital printing', 'Flexographic printing', 'Gravure printing', 'CMYK', 'Pantone color matching', 'Custom logo printing'],
    finishOptions: ['Matte lamination', 'Gloss lamination', 'Soft-touch lamination', 'Foil stamping', 'Embossing', 'Debossing', 'Spot UV', 'Window patching'],
    applications: ['Retail packaging', 'Ecommerce shipping', 'Food packaging', 'Cosmetic packaging', 'Gift packaging', 'Pharma packaging', 'Branded promotional packaging'],
    industries: ['Food', 'Beverage', 'Coffee and tea', 'Cosmetics', 'Skincare', 'Apparel', 'Gifts', 'Ecommerce', 'Pharmaceutical', 'Pet food', 'Cannabis where compliant'],
    moq: '500 PCS',
    oemOdm: 'OEM/ODM custom packaging supported',
    customSize: 'Custom size, structure and dieline supported',
    url: `${SITE_URL}/${rel}`,
    rfqContact: { '@type': 'ContactPoint', contactType: 'sales', name: 'Linda Wang', email: 'linda@colorprintingpackage.com', telephone: '+86-181-6573-0353', url: `${SITE_URL}/contact.html` },
    audience: { '@type': 'BusinessAudience', audienceType: 'B2B custom packaging buyers, importers, distributors and brand owners' },
    potentialAction: {
      '@type': 'ContactAction',
      name: 'Request a custom packaging quote',
      target: `${SITE_URL}/contact.html`
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'MOQ', value: '500 PCS' },
      { '@type': 'PropertyValue', name: 'Customization', value: 'Yes, OEM/ODM supported' },
      { '@type': 'PropertyValue', name: 'Custom size support', value: 'Custom size, structure and dieline supported' },
      { '@type': 'PropertyValue', name: 'Printing options', value: 'Offset printing, digital printing, flexographic printing, CMYK, Pantone color and custom logo printing' },
      { '@type': 'PropertyValue', name: 'Finish options', value: 'Matte lamination, gloss lamination, soft-touch lamination, foil stamping, embossing, debossing, spot UV and window patching' },
      { '@type': 'PropertyValue', name: 'Applications', value: 'Retail packaging, ecommerce shipping, food packaging, cosmetic packaging, gift packaging, pharma packaging and branded promotional packaging' },
      { '@type': 'PropertyValue', name: 'Industries', value: 'Food, beverage, coffee and tea, cosmetics, skincare, apparel, gifts, ecommerce, pharmaceutical, pet food and cannabis where compliant' },
      { '@type': 'PropertyValue', name: 'OEM/ODM', value: 'OEM and ODM custom packaging manufacturing supported' },
      { '@type': 'PropertyValue', name: 'RFQ contact', value: 'Send size, quantity, material, printing colors, finish, destination country and artwork file for quotation' },
      { '@type': 'PropertyValue', name: 'Business Model', value: 'B2B, factory direct, RFQ only' }
    ],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      eligibleQuantity: { '@type': 'QuantitativeValue', minValue: 500, unitText: 'PCS' },
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'USD',
        description: 'B2B RFQ only. Final unit price depends on size, structure, material, printing, finish, quantity, packaging method and destination.'
      },
      description: 'B2B RFQ required. MOQ 500 PCS. Per-unit price varies by size, material, printing, finish and order quantity. Contact for exact quotation.',
      url: `${SITE_URL}/${rel}`,
      seller: {
        '@type': 'Organization',
        name: 'Packaging Factory Direct',
        contactPoint: { '@type': 'ContactPoint', contactType: 'sales', name: 'Linda Wang', email: 'linda@colorprintingpackage.com', telephone: '+86-181-6573-0353' }
      }
    }
  };
}

function articleJsonLd(html, rel, title, description, sourceUrl) {
  const image = firstImageAbsoluteUrl(html, sourceUrl);
  const publishedTime = getMeta(html, 'property', 'article:published_time') || undefined;
  const modifiedTime = getMeta(html, 'property', 'article:modified_time') || undefined;
  const isNews = rel.startsWith('news/');
  return {
    '@context': 'https://schema.org',
    '@type': isNews ? 'NewsArticle' : 'Article',
    headline: title.replace(/\s*\|\s*.+$/, '').trim(),
    description: description,
    image: [image],
    articleSection: isNews ? 'Packaging Industry News' : 'Custom Packaging Buyer Guide',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/${rel}` },
    author: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Packaging Factory Direct',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` }
    },
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime
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

function collectionPageJsonLd(html, rel, title, description) {
  if (getKindFromRel(rel) !== 'category') return null;
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']*\/products\/[^"']+\.html|[^"']*products\/[^"']+\.html|[^"']*\.html)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((m) => {
      const href = normalizeRootHref(m[1], 'products');
      if (!href.includes('/products/') && !href.startsWith('/products/')) return null;
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
        publisher: { '@type': 'Organization', name: 'Packaging Factory Direct', url: SITE_URL }
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

function productSignals(title, description, rel, html) {
  const text = `${title} ${description} ${rel} ${html.replace(/<[^>]+>/g, ' ')}`.toLowerCase();
  const flags = {
    flexible: /pouch|bag|mylar|film|coffee|valve|spout|zipper|stand[- ]?up|laminate/.test(text),
    food: /food|coffee|tea|bakery|cookie|chocolate|pizza|burger|salad|snack|pet food|grease|beverage/.test(text),
    pharma: /pharma|medical|medicine|syringe|steril|datamatrix|gs1|tamper|serialization|healthcare/.test(text),
    cosmetic: /cosmetic|skincare|beauty|cream|serum|lip|makeup|fragrance/.test(text),
    gift: /gift|rigid|magnetic|jewelry|drawer|insert|luxury|candle|unboxing/.test(text),
    mailer: /mailer|corrugated|ecommerce|shipping|subscription/.test(text),
    label: /label|sticker|adhesive|roll|barcode|qr/.test(text),
    paperBag: /paper bag|shopping bag|handle|rope handle|carry bag/.test(text)
  };
  if (flags.pharma) return {
    family: 'pharma and medical packaging',
    materials: ['SBS/art paper carton', 'tamper-evident paperboard', 'security label stock', 'traceability-ready print area'],
    checks: ['GS1/DataMatrix readability after varnish or lamination', 'batch and lot code placement', 'tamper-evident opening test', 'carton scuff and edge-crush review'],
    comparison: [
      ['Serialized carton', 'Best for traceability, batch control and regulated distribution'],
      ['Security label', 'Best for tamper evidence and anti-counterfeit sealing'],
      ['Rigid presentation box', 'Best for premium medical aesthetic kits, but costs and freight are higher']
    ],
    rfq: ['barcode type and minimum scan grade', 'carton size and syringe/device fit', 'batch/lot printing area', 'tamper-evident seal requirement', 'destination compliance notes']
  };
  if (flags.flexible || flags.food) return {
    family: flags.flexible ? 'flexible food and pouch packaging' : 'food contact paper packaging',
    materials: flags.flexible ? ['PET/PE laminate', 'MOPP/VMPET/PE barrier film', 'kraft paper laminate', 'recyclable or compostable film options'] : ['food-grade paperboard', 'kraft paper', 'coated paper', 'grease-resistant paper', 'corrugated board'],
    checks: ['seal strength or glue strength test', 'grease/moisture resistance review', 'odor check before packing', 'carton packing compression check'],
    comparison: [
      ['High-barrier laminate', 'Best for coffee, tea, pet food and products needing aroma or moisture protection'],
      ['Kraft paper look', 'Best for natural branding, but barrier layer must be confirmed for oily or wet products'],
      ['Paperboard food box', 'Best for display and takeaway structure, less compact than pouches for shipping']
    ],
    rfq: ['food-contact requirement', 'product weight and shelf-life target', 'barrier requirement', 'zipper/valve/window choice', 'packing temperature and destination country']
  };
  if (flags.cosmetic) return {
    family: 'cosmetic and skincare packaging',
    materials: ['SBS paperboard', 'specialty paper', 'greyboard rigid box', 'PVC/PET window material', 'label stock'],
    checks: ['Pantone color drawdown before mass print', 'soft-touch scratch resistance', 'insert fit against bottle or jar tolerance', 'foil and embossing registration'],
    comparison: [
      ['Folding carton', 'Best for cost-efficient retail shelf display'],
      ['Rigid gift box', 'Best for launch kits and premium sets with higher unboxing value'],
      ['Label plus carton', 'Best when bottle decoration and secondary box must match']
    ],
    rfq: ['bottle or jar dimensions', 'Pantone/brand color target', 'finish sample reference', 'insert material', 'retail display or ecommerce shipping use']
  };
  if (flags.gift) return {
    family: 'premium gift and rigid packaging',
    materials: ['greyboard', 'art paper wrap', 'specialty paper', 'EVA/EPE/foam insert', 'ribbon or magnetic closure hardware'],
    checks: ['greyboard thickness and corner finish', 'magnet pull force or closure alignment', 'insert cavity tolerance', 'foil stamping and embossing registration'],
    comparison: [
      ['Rigid magnetic box', 'Best for premium unboxing and retail gifting'],
      ['Collapsible magnetic box', 'Best when freight volume matters'],
      ['Drawer box', 'Best for layered reveal and small product sets']
    ],
    rfq: ['product size and weight', 'assembled or flat-pack shipping choice', 'insert cavity drawing', 'paper wrap and finish sample', 'target unboxing experience']
  };
  if (flags.mailer) return {
    family: 'ecommerce mailer and shipping packaging',
    materials: ['E-flute corrugated board', 'B-flute corrugated board', 'kraft liner', 'white kraft liner', 'protective insert paperboard'],
    checks: ['folding line strength', 'edge crush and corner protection', 'tape or locking tab fit', 'drop-test requirement for destination shipping'],
    comparison: [
      ['Corrugated mailer', 'Best for shipping protection and subscription boxes'],
      ['Cardstock product box', 'Best for retail shelf presentation, usually needs outer carton for shipping'],
      ['Mailer plus insert', 'Best for fragile or multi-piece ecommerce kits']
    ],
    rfq: ['product weight', 'shipping method', 'board flute preference', 'drop-test target', 'inside product protection requirement']
  };
  if (flags.label) return {
    family: 'labels and stickers',
    materials: ['paper label stock', 'PP/PET waterproof film', 'security label stock', 'roll label liner'],
    checks: ['adhesive match to bottle, pouch or box surface', 'roll direction and core size', 'water/oil resistance', 'barcode and QR scan test'],
    comparison: [
      ['Paper label', 'Best for dry retail boxes and kraft branding'],
      ['PP/PET label', 'Best for cosmetics, beverages and wet handling'],
      ['Security label', 'Best for tamper evidence and traceability']
    ],
    rfq: ['label size', 'surface material', 'roll or sheet format', 'adhesive requirement', 'barcode/QR scan requirement']
  };
  if (flags.paperBag) return {
    family: 'retail paper bags',
    materials: ['kraft paper', 'art paper', 'cotton rope handle', 'ribbon handle', 'reinforced bottom board'],
    checks: ['handle pull strength', 'bottom reinforcement', 'folding crease accuracy', 'ink rub resistance'],
    comparison: [
      ['Kraft paper bag', 'Best for natural retail branding and heavier daily use'],
      ['Art paper bag', 'Best for vivid color and luxury retail finish'],
      ['Gift bag with ribbon', 'Best for premium gift presentation']
    ],
    rfq: ['bag size', 'paper GSM', 'handle type', 'load weight', 'finish and bottom reinforcement']
  };
  return {
    family: 'custom printed packaging',
    materials: ['greyboard', 'art paper', 'kraft paper', 'corrugated board', 'specialty paper', 'laminated film where required'],
    checks: ['dieline fit against product dimensions', 'material thickness confirmation', 'print color approval', 'finish and packing method review'],
    comparison: [
      ['Folding carton', 'Best for retail shelf display and cost control'],
      ['Rigid box', 'Best for premium presentation and gift sets'],
      ['Flexible pouch or bag', 'Best for compact shipping and refill products']
    ],
    rfq: ['product dimensions', 'quantity', 'material and thickness', 'printing colors', 'finish option', 'destination country']
  };
}
function htmlList(items) {
  return items.map(item => `<li>${htmlEscape(item)}</li>`).join('');
}
function comparisonRows(rows) {
  return rows.map(([option, use]) => `<tr><th>${htmlEscape(option)}</th><td>${htmlEscape(use)}</td></tr>`).join('');
}
function caseEvidenceHtml(caseEvidence) {
  if (!caseEvidence) return '';
  const photo = caseEvidence.photo ? `<figure class="gallery-main" style="max-width:520px;margin:18px 0;"><img src="${htmlEscape(caseEvidence.photo)}" alt="${htmlEscape(caseEvidence.caseTitle || 'Product case photo')}" loading="lazy" decoding="async" width="800" height="800"/></figure>` : '';
  return `<h2>Real Product Case Reference</h2><p>${htmlEscape(caseEvidence.caseTitle || 'Custom packaging case reference')}</p>${photo}<table class="spec-table"><tbody><tr><th>Size / dieline</th><td>${htmlEscape(caseEvidence.dimension || 'Custom size confirmed by dieline and product fit sample')}</td></tr><tr><th>Material</th><td>${htmlEscape(caseEvidence.material || 'Material confirmed during sampling')}</td></tr><tr><th>Application industry</th><td>${htmlEscape(caseEvidence.industry || 'B2B custom packaging')}</td></tr><tr><th>Before sampling</th><td>${htmlEscape(caseEvidence.sampleBefore || 'Buyer sends size, artwork, material request and reference sample')}</td></tr><tr><th>After sample adjustment</th><td>${htmlEscape(caseEvidence.sampleAfter || 'Factory checks dieline fit, print color, finish, insert tolerance and packing method')}</td></tr><tr><th>Procurement tip</th><td>${htmlEscape(caseEvidence.decisionTip || 'Confirm size, material, finish, quantity and destination before mass production')}</td></tr></tbody></table>`;
}
function productProcurementSection(title, description, rel, html, trustLis, catLis, caseEvidence) {
  const signals = productSignals(title, description, rel, html);
  const cleanTitle = title.replace(/\s*\|\s*.+$/, '').trim();
  return `<section class="section" data-injected="buyer-guide"><div class="container"><h2>Procurement Notes for ${htmlEscape(cleanTitle)}</h2><p>This ${htmlEscape(signals.family)} page is useful for buyers comparing structure, material, production risk and RFQ details before requesting a factory quote. Use the notes below to reduce sampling revisions and make the quotation faster.</p>${caseEvidenceHtml(caseEvidence)}<h2>Key Parameters to Confirm</h2><table class="spec-table"><tbody><tr><th>Typical materials</th><td>${htmlEscape(signals.materials.join(', '))}</td></tr><tr><th>MOQ</th><td>500 PCS for most custom packaging orders</td></tr><tr><th>Customization</th><td>Custom size, structure, dieline, logo printing, finish and insert options</td></tr><tr><th>RFQ fields</th><td>${htmlEscape(signals.rfq.join(', '))}</td></tr></tbody></table><h2>Buyer Decision Comparison</h2><table class="spec-table"><tbody>${comparisonRows(signals.comparison)}</tbody></table><h2>Factory Checks Before Mass Production</h2><ul>${htmlList(signals.checks)}</ul><h2>Real Production Proof to Review</h2><p>Before confirming mass production, review factory photos, QC workflow, sample process and packing guidance. These pages help buyers verify whether the supplier has real production, inspection and export handling experience.</p><ul><li><a href="/about.html#factory-visual-proof">Factory photo proof and production areas</a></li><li><a href="/blog/factory-production-showroom-qc-office-trade-show-gallery.html">Production, showroom, QC and trade show gallery</a></li><li><a href="/quality-control.html">Quality control workflow</a></li><li><a href="/sample-process.html">Sample approval process</a></li></ul><h2>What to Send for Quotation</h2><p>For a fast factory-direct RFQ, send product size, order quantity, material, printing colors, finish, destination country and artwork file. Include product weight, packing method and compliance notes when relevant.</p><ul>${htmlList(signals.rfq)}</ul><h2>Buyer-Guide Pages</h2><ul>${trustLis}</ul><h2>Related Product Categories</h2><ul>${catLis}</ul></div></section>`;
}

function buyerGuideSection(kind, rel, title, description, html, caseEvidence) {
  // Additive-only buyer guide links, rendered AFTER the original body.
  // Never appears on: homepage (index.html), products list, blog list, news list, or the 7 trust pages themselves.
  // Product detail: append a compact buyer-guide box.
  // Blog/news detail: append related product-category shortcuts + buyer-guide links.
  const TRUST_LINKS = [
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
    return productProcurementSection(title, description, rel, html, trustLis, catLis, caseEvidence);
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
  const title = getTitle(html);
  const description = getDescription(html, rel);
  const bodyHtml = normalizeHomepageSemanticH1(extractBody(html, result), rel);
  const caseEvidence = await readProductCaseEvidence(rel);
  const buyerGuide = buyerGuideSection(kind, rel, title, description, html, caseEvidence);
  const trustSchema = trustPageJsonLd(rel, title, description);
  const faqSchema = faqPageJsonLd(rel);
  const collectionSchema = collectionPageJsonLd(html, rel, title, description);

  // Original static <head> content is not rendered inside the extracted body,
  // so SEO schemas are injected here at the App Router layer.
  const injectProduct = kind === 'products' && rel !== 'products.html';
  const articleType = kind === 'news' ? 'NewsArticle' : 'Article';
  const injectArticle = (kind === 'blog' || kind === 'news') && rel !== 'blog.html' && rel !== 'news.html' && !hasInlineJsonLdOfType(bodyHtml, articleType);
  const injectTrust = Boolean(trustSchema);
  const injectFaq = Boolean(faqSchema);
  const injectCollection = Boolean(collectionSchema);
  const productsLoaderScript = rel === 'products.html' ? productListLoaderScriptForRenderedUrls() : '';

  return (
    <>
      {bc ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bc) }}
        />
      ) : null}
      {injectProduct ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(html, rel, title, description, sourceUrl)) }}
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      {injectCollection ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      ) : null}
      <main dangerouslySetInnerHTML={{ __html: bodyHtml + buyerGuide }} />
      {productsLoaderScript ? (
        <script dangerouslySetInnerHTML={{ __html: productsLoaderScript.replace(/^<script>|<\/script>$/g, '') }} />
      ) : null}
    </>
  );
}
