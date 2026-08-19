# -*- coding: utf-8 -*-
"""Analyze one product page structure."""
import io, sys, re
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

path = sys.argv[1]
html = open(path, encoding='utf-8', errors='replace').read()
soup = BeautifulSoup(html, 'html.parser')
print('TITLE:', soup.title.get_text() if soup.title else None)
print('CANON:', soup.find('link', rel='canonical')['href'] if soup.find('link', rel='canonical') else None)
for s in soup.find_all('section'):
    h = s.find(['h1', 'h2', 'h3', 'h4'])
    txt = h.get_text(' ', strip=True) if h else '(none)'
    print('SECTION class=%s id=%s H=%s' % (s.get('class'), s.get('id'), txt[:70]))
print('--- text blocks ---')
n = 0
for el in soup.find_all(string=True):
    s = re.sub(r'\s+', ' ', el).strip()
    if s and el.parent.name not in ('script', 'style', 'head') and len(s) > 1:
        print('[%s] %s' % (el.parent.name, s[:130]))
        n += 1
        if n >= 200:
            break
