# -*- coding: utf-8 -*-
"""Pretty-print an HTML file so minified long lines become readable."""
import sys, io
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

src = sys.argv[1]
with open(src, encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
print(soup.prettify())
