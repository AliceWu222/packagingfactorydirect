# -*- coding: utf-8 -*-
"""Extract per-page variable data from the 20 product pages."""
import re
import json
import html as htmllib

BASE = r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site'
with open(BASE + r'\scripts\multilang\20-products.txt', encoding='utf-8-sig') as f:
    pages = [ln.strip() for ln in f if ln.strip()]

def clean(x):
    if not x:
        return ''
    if hasattr(x, 'group'):
        x = x.group(1)
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', '', x))).strip()

out = []
for pg in pages:
    path = BASE + '\\' + pg
    src = open(path, encoding='utf-8', errors='replace').read()
    d = {'file': pg}
    d['title'] = re.search(r'<title>(.*?)</title>', src, re.S)
    d['title'] = clean(d['title'])
    d['desc'] = re.search(r'<meta content="([^"]*)" name="description"/>', src)
    d['desc'] = d['desc'].group(1) if d['desc'] else ''
    d['canonical'] = re.search(r'<link href="([^"]*)" rel="canonical"/>', src).group(1)
    ld = re.search(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)
    d['jsonld'] = ld.group(1).strip() if ld else ''
    d['og_title'] = re.search(r'<meta content="([^"]*)" property="og:title"/>', src).group(1)
    d['og_img'] = re.search(r'<meta content="([^"]*)" property="og:image"/>', src)
    d['og_img'] = d['og_img'].group(1) if d['og_img'] else ''
    d['eyebrow'] = re.search(r'<div class="eyebrow">(.*?)</div>', src, re.S)
    d['eyebrow'] = clean(d['eyebrow'])
    d['h1'] = re.search(r'<h1>(.*?)</h1>', src, re.S)
    d['h1'] = clean(d['h1'])
    hero = re.search(r'<section class="page-hero">.*?<p>(.*?)</p>', src, re.S)
    d['hero_p'] = clean(hero)
    img = re.search(r'<img alt="([^"]*)"[^>]*src="(\.\./assets/img/products/[^"]*)"', src)
    if not img:
        img = re.search(r'<img[^>]*src="(\.\./assets/img/products/[^"]*)" alt="([^"]*)"', src)
    d['img_alt'] = img.group(1) if img else ''
    d['img_src'] = img.group(2) if img else (img.group(1) if img else '')
    d['tag'] = re.search(r'<span class="tag">(.*?)</span>', src, re.S)
    d['tag'] = clean(d['tag'])
    d['detail_h2'] = re.search(r'<div class="product-detail">.*?<h2>(.*?)</h2>', src, re.S)
    d['detail_h2'] = clean(d['detail_h2'])
    intro = re.search(r'<div class="product-detail">.*?</span>\s*<h2>.*?</h2>\s*<p>(.*?)</p>', src, re.S)
    d['intro_p'] = clean(intro)
    rows = re.findall(r'<tr><th>(.*?)</th><td>(.*?)</td></tr>', src, re.S)
    d['specs'] = [(clean(t), clean(v)) for t, v in rows]
    # WhatsApp link
    wa = re.search(r'href="https://wa\.me/8618165730353\?text=([^"]*)"[^>]*>WhatsApp Linda', src)
    d['wa_text'] = wa.group(1) if wa else ''
    dm = re.search(r'data-mail-product="([^"]*)"', src)
    d['mail_product'] = dm.group(1) if dm else ''
    ai = re.search(r'AI Buyer Snapshot</h2><p>(.*?)</p>', src, re.S)
    d['ai_p'] = clean(ai)
    rel = re.findall(r'<li><a href="(\.\./products/[^"]*)">(.*?)</a></li>', src, re.S)
    d['related'] = [(h, clean(t)) for h, t in rel]
    out.append(d)

with open(BASE + r'\scripts\multilang\product_pages_data.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

for d in out:
    print('=' * 20)
    print(d['file'])
    print('T:', d['title'])
    print('EYEBROW:', d['eyebrow'], '| H1:', d['h1'])
    print('TAG:', d['tag'], '| H2:', d['detail_h2'])
    print('IMG:', d['img_src'], '| ALT:', d['img_alt'])
    print('SPECS:', d['specs'])
    print('RELATED:', d['related'])
