# -*- coding: utf-8 -*-
"""Extract text content with tag paths from index.html for translation planning."""
import re
import html as htmllib
from html.parser import HTMLParser

SRC = r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\index.html'

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.out = []
        self.skip = {'script', 'style', 'noscript'}
        self.skipping = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.skip:
            self.skipping += 1
        self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.skip and self.skipping:
            self.skipping -= 1
        if self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if self.skipping:
            return
        t = data.strip()
        if not t:
            return
        path = '>'.join(self.stack[-4:])
        self.out.append((path, t))

p = TextExtractor()
p.feed(open(SRC, encoding='utf-8', errors='replace').read())
for path, t in p.out:
    print(f'{path} :: {t[:120]}')
print('TOTAL TEXT NODES:', len(p.out))
