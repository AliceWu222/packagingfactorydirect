# -*- coding: utf-8 -*-
"""Dump pretty-printed head + non-card structure of index.html and products.html."""
import re

def pretty(html_in):
    # Insert newline before block-level opening tags and after closing tags
    tags = r'(</?(?:html|head|body|div|section|header|footer|article|nav|form|ul|li|table|tr|tbody|script|meta|link|title|h1|h2|h3|h4|p|span|a|button|img|input|select|option|textarea|br|small|em|i|b)[^>]*>)'
    return re.sub(tags, r'\n\1', html_in)

for name, path in [('index', r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\index.html'),
                   ('products', r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\products.html')]:
    src = open(path, encoding='utf-8', errors='replace').read()
    # head section only (up to </head>)
    head = src.split('</head>')[0] + '</head>'
    open(rf'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\{name}_head.txt', 'w', encoding='utf-8').write(pretty(head))

# For products.html: dump everything between </header> (end of header) and first product-card article,
# plus everything after the last </article> to end (excluding footer? include all).
src = open(r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\products.html', encoding='utf-8', errors='replace').read()
m = re.search(r'</header>', src)
after_header = src[m.end():]
first_card = re.search(r'<article class="product-card"', after_header)
pre_cards = after_header[:first_card.start()]
open(r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\products_pre_cards.txt', 'w', encoding='utf-8').write(pretty(pre_cards))
last_card_end = after_header.rfind('</article>')
post_cards = after_header[last_card_end + len('</article>'):]
open(r'C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\products_post_cards.txt', 'w', encoding='utf-8').write(pretty(post_cards))
print('done')
