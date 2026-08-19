# -*- coding: utf-8 -*-
"""Extract product card info from products.html into a compact JSON list."""
import re
import json
import html

src = open(r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\products.html', encoding='utf-8', errors='replace').read()
print('total length', len(src))

cards = re.findall(r'<article class="product-card"[^>]*>.*?</article>', src, re.S)
print('num cards', len(cards))

out = []
for c in cards:
    ds = re.search(r'data-search="([^"]*)"', c)
    href = re.search(r'<a href="([^"]*)"', c)
    tag = re.search(r'<span class="tag">(.*?)</span>', c, re.S)
    h3 = re.search(r'<h3>(.*?)</h3>', c, re.S)
    p = re.search(r'<p>(.*?)</p>', c, re.S)
    def clean(x):
        if not x:
            return ''
        t = re.sub(r'<[^>]+>', '', x.group(1))
        return html.unescape(t).strip()
    out.append({
        'data_search': ds.group(1) if ds else '',
        'href': href.group(1) if href else '',
        'tag': clean(tag),
        'h3': clean(h3),
        'p': clean(p),
    })

with open(r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\products_cards.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=0)

# Print compact summary: index | tag | h3 | p
for i, o in enumerate(out):
    print(f'[{i}] ({o["tag"]}) {o["h3"][:80]}')
