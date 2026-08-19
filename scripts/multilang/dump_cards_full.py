# -*- coding: utf-8 -*-
"""Dump full card text for translation (chunked into 4 files)."""
import json
import re

BASE = r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang'
cards = json.load(open(BASE + r'\products_cards.json', encoding='utf-8'))

# also collect index card (href -> h3/p/tag) map to find index-only cards
src = open(BASE + r'\..\..\index.html', encoding='utf-8', errors='replace').read()
articles = re.findall(r'<article class="product-card"[^>]*>.*?</article>', src, re.S)
index_cards = {}
for a in articles:
    href = re.search(r'<a href="([^"]*)"', a)
    tag = re.search(r'<span class="tag">(.*?)</span>', a, re.S)
    h3 = re.search(r'<h3>(.*?)</h3>', a, re.S)
    p = re.search(r'<p>(.*?)</p>', a, re.S)
    def clean(x):
        if not x:
            return ''
        t = re.sub(r'<[^>]+>', '', x.group(1))
        return re.sub(r'\s+', ' ', __import__('html').unescape(t)).strip()
    if href:
        index_cards[href.group(1)] = {'tag': clean(tag), 'h3': clean(h3), 'p': clean(p)}

print('index cards:', len(index_cards))
print('index-only hrefs:', [h for h in index_cards if h not in {c['href'] for c in cards}])

def emit(chunk, path):
    with open(path, 'w', encoding='utf-8') as f:
        for c in chunk:
            f.write(f"[{c['href']}]\nTAG: {c['tag']}\nH3: {c['h3']}\nP: {c['p']}\n\n")

n = len(cards)
emit(cards[0:48], BASE + r'\cards_dump_1.txt')
emit(cards[48:96], BASE + r'\cards_dump_2.txt')
emit(cards[96:144], BASE + r'\cards_dump_3.txt')
emit(cards[144:192], BASE + r'\cards_dump_4.txt')
# index-only cards (if any)
extra = [v for k, v in index_cards.items() if k not in {c['href'] for c in cards}]
if extra:
    emit(extra, BASE + r'\cards_dump_5.txt')
print('done', n)
