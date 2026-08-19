# -*- coding: utf-8 -*-
"""Extract full structural info from index.html and products.html for rebuilding in Arabic."""
import re
import json
import html as htmllib

BASE = r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang'

def clean(x):
    if not x:
        return ''
    if hasattr(x, 'group'):
        x = x.group(1)
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', '', x))).strip()

def extract_cards(html_src):
    """Return list of dicts with href, img_src, img_alt, tag, h3, p for each product-card."""
    out = []
    for a in re.findall(r'<article class="product-card"[^>]*>.*?</article>', html_src, re.S):
        ds = re.search(r'data-search="([^"]*)"', a)
        href = re.search(r'<a href="([^"]*)"', a)
        img = re.search(r'<img ([^>]*?)/?>', a)
        img_src = re.search(r'src="([^"]*)"', img.group(1)) if img else None
        img_alt = re.search(r'alt="([^"]*)"', img.group(1)) if img else None
        tag = re.search(r'<span class="tag">(.*?)</span>', a, re.S)
        h3 = re.search(r'<h3>(.*?)</h3>', a, re.S)
        p = re.search(r'<p>(.*?)</p>', a, re.S)
        out.append({
            'data_search': ds.group(1) if ds else '',
            'href': clean(href.group(1)) if href else '',
            'img_src': img_src.group(1) if img_src else '',
            'img_alt': img_alt.group(1) if img_alt else '',
            'tag': clean(tag),
            'h3': clean(h3),
            'p': clean(p),
        })
    return out

def extract_sections(html_src, section_ids):
    """Extract named sections by id attribute, returning dict id -> {eyebrow,h2,p,cards}."""
    out = {}
    for sid in section_ids:
        m = re.search(r'<section[^>]*id="' + re.escape(sid) + r'"[^>]*>(.*?)</section>', html_src, re.S)
        if not m:
            continue
        body = m.group(1)
        eyebrow = re.search(r'<div class="eyebrow">(.*?)</div>', body, re.S)
        h2 = re.search(r'<h2>(.*?)</h2>', body, re.S)
        p = re.search(r'<h2>.*?</h2>\s*<p>(.*?)</p>', body, re.S)
        out[sid] = {
            'eyebrow': clean(eyebrow),
            'h2': clean(h2),
            'p': clean(p),
            'cards': extract_cards(body),
        }
    return out

# ---- index.html ----
src = open(BASE + r'\..\..\index.html', encoding='utf-8', errors='replace').read()
index = {
    'title': re.search(r'<title>(.*?)</title>', src, re.S).group(1).strip(),
    'desc': re.search(r'<meta content="([^"]*)" name="description"/>', src).group(1),
    'canonical': re.search(r'<link href="([^"]*)" rel="canonical"/>', src).group(1),
    'og_title': re.search(r'<meta content="([^"]*)" property="og:title"/>', src).group(1),
    'og_img': re.search(r'<meta content="([^"]*)" property="og:image"/>', src).group(1),
    'categories': extract_cards(re.search(r'<section class="section">\s*<div class="container">\s*<div class="section-head">.*?Featured Categories.*?</div>\s*<div class="grid">(.*?)</div>\s*</div>\s*</section>', src, re.S).group(1)) if re.search(r'<section class="section">\s*<div class="container">\s*<div class="section-head">.*?Featured Categories.*?</div>\s*<div class="grid">(.*?)</div>\s*</div>\s*</section>', src, re.S) else [],
    'sections': extract_sections(src, ['high-value-products', 'feminine-high-value-products', 'v32-high-margin-product-picks', 'v33-premium-new-product-lines']),
}
json.dump(index, open(BASE + r'\index_structure.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('index sections:', {k: len(v['cards']) for k, v in index['sections'].items()}, 'categories:', len(index['categories']))

# ---- products.html ----
src = open(BASE + r'\..\..\products.html', encoding='utf-8', errors='replace').read()
products = {
    'title': re.search(r'<title>(.*?)</title>', src, re.S).group(1).strip(),
    'desc': re.search(r'<meta content="([^"]*)" name="description"/>', src).group(1),
    'canonical': re.search(r'<link href="([^"]*)" rel="canonical"/>', src).group(1),
    'og_img': re.search(r'<meta content="([^"]*)" property="og:image"/>', src).group(1),
    'cards': extract_cards(src),
}
json.dump(products, open(BASE + r'\products_structure.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('products cards:', len(products['cards']))
