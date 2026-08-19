# -*- coding: utf-8 -*-
"""Extract unique text nodes from the 23 source pages, with context tag and count."""
import sys, io, re, collections
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site"

# The 20 product files from 20-products.txt
files = ["index.html", "products.html", "contact.html"]
with open(ROOT + r"\scripts\multilang\20-products.txt", encoding='utf-8-sig') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        files.append(line.split("|")[-1].strip())

SKIP = {"script", "style", "noscript"}

texts = collections.Counter()
attrs = collections.Counter()
metas = {}   # file -> (title, description, canonical)

for fn in files:
    with open(ROOT + "\\" + fn, encoding='utf-8', errors='replace') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')
    # meta info
    t = soup.find('title')
    d = soup.find('meta', attrs={'name': 'description'})
    c = soup.find('link', attrs={'rel': 'canonical'})
    metas[fn] = (t.get_text() if t else '', d.get('content','') if d else '', c.get('href','') if c else '')
    # text nodes
    for el in soup.find_all(string=True):
        if el.parent.name in SKIP:
            continue
        s = re.sub(r'\s+', ' ', el).strip()
        if s:
            texts[s] += 1
    # key attributes
    for el in soup.find_all(attrs={'alt': True}):
        a = el['alt'].strip()
        if a:
            attrs['alt: ' + a] += 1
    for el in soup.find_all(attrs={'placeholder': True}):
        a = el['placeholder'].strip()
        if a:
            attrs['ph: ' + a] += 1
    for el in soup.find_all(attrs={'aria-label': True}):
        a = el['aria-label'].strip()
        if a:
            attrs['aria: ' + a] += 1
    for el in soup.find_all(attrs={'data-search': True}):
        a = el['data-search'].strip()
        if a:
            attrs['ds: ' + a] += 1

print("=== META ===")
for fn, (t, d, c) in metas.items():
    print(fn, "| TITLE:", t)
    print(fn, "| DESC:", d)
    print(fn, "| CANON:", c)
    print("---")

print("=== UNIQUE TEXT NODES (%d) ===" % len(texts))
for s, n in sorted(texts.items(), key=lambda x: -x[1]):
    print("[%d] %s" % (n, s))

print("=== UNIQUE ATTR VALUES (%d) ===" % len(attrs))
for s, n in sorted(attrs.items(), key=lambda x: -x[1]):
    print("[%d] %s" % (n, s))
