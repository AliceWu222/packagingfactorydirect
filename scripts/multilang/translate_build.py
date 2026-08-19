# -*- coding: utf-8 -*-
"""Build Spanish (es/) version of packagingfactorydirect.com pages from English sources.

- Applies the EN->ES dictionary to text nodes, attributes, meta and JSON-LD.
- Rewrites lang, canonical/og:url, asset paths, internal links.
- NEVER modifies source files.
"""
import json, os, re, html as H, urllib.parse

BASE = r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site"
OUT  = os.path.join(BASE, "es")
DICT = json.load(open(os.path.join(BASE, "scripts", "multilang", "es_dict.json"), encoding="utf-8"))

PRODUCTS20 = {
 "custom-packaging-boxes.html","custom-gift-boxes.html","custom-magnetic-gift-box-gold-foil-logo.html",
 "luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html","stand-up-pouches.html","custom-coffee-bags.html",
 "pet-food-stand-up-pouches.html","food-packaging-boxes.html","pharmaceutical-packaging-boxes.html",
 "cosmetic-packaging-boxes.html","food-containers.html","custom-paper-bags.html","custom-shipping-boxes.html",
 "bubble-mailers.html","custom-courier-bags.html","custom-tin-boxes.html","pet-food-pharma-bottles.html",
 "custom-tissue-paper.html","custom-cards-playing-cards.html",
 "custom-takeaway-boxes-wholesale-eco-friendly-logo-printed-disposable-food-packaging-boxes-manufacturer.html",
}
ROOT_ES = {"index.html", "products.html", "contact.html"}

# ---------- dictionary regex (longest-first, word-boundary guarded, escaped + raw variants) ----------
_pairs = []
for k in DICT:
    esc = H.escape(k, quote=False)
    if esc != k:
        _pairs.append((esc, DICT[k]))
    _pairs.append((k, DICT[k]))
# dedup by key text
_pairs = sorted(set(_pairs), key=lambda p: -len(p[0]))
_pat = r"(?<![A-Za-z0-9])(?:%s)(?![A-Za-z0-9])" % "|".join(re.escape(k) for k, _ in _pairs)
DICT_RE = re.compile(_pat)
_DICT_BY_KEY = dict(_pairs)

def translate_text(s):
    def repl(m):
        return H.escape(_DICT_BY_KEY[m.group(0)], quote=False)
    return DICT_RE.sub(repl, s)

# ---------- JSON-LD handling ----------
LD_KEYS = ("name", "description", "category", "text")
LD_RE = re.compile(r'(<script[^>]*type="application/ld\+json"[^>]*>)(.*?)(</script>)', re.S)

def translate_jsonld(obj):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in LD_KEYS and isinstance(v, str):
                out[k] = DICT.get(v, v)
            else:
                out[k] = translate_jsonld(v)
        return out
    if isinstance(obj, list):
        return [translate_jsonld(x) for x in obj]
    return obj

def fix_jsonld(seg):
    m = LD_RE.match(seg)
    if not m:
        return seg
    open_tag, body, close_tag = m.group(1), m.group(2), m.group(3)
    try:
        obj = json.loads(body)
    except Exception:
        return seg
    try:
        new = translate_jsonld(obj)
        return open_tag + json.dumps(new, ensure_ascii=False, separators=(",", ":")) + close_tag
    except Exception:
        return seg

# ---------- URL protection (dict pass must never touch URLs) ----------
URL_ATTR_RE = re.compile(r'\b(href|src|action)="([^"]+)"')
META_URL_RE = re.compile(r'(<meta content=")(https://[^"]+)(")')
VAL_URL_RE = re.compile(r'(value=")(https://[^"]+)(")')

def protect_urls(s):
    tokens = {}
    def tokenize(url):
        key = "\x00U%d\x00" % len(tokens)
        tokens[key] = url
        return key
    def repl_attr(m):
        return m.group(1) + '="' + tokenize(m.group(2)) + '"'
    s = URL_ATTR_RE.sub(repl_attr, s)
    s = META_URL_RE.sub(lambda m: m.group(1) + tokenize(m.group(2)) + m.group(3), s)
    s = VAL_URL_RE.sub(lambda m: m.group(1) + tokenize(m.group(2)) + m.group(3), s)
    return s, tokens

def restore_urls(s, tokens):
    for k, v in tokens.items():
        s = s.replace(k, v)
    return s

# ---------- structural rewrites ----------
def fix_urls(s):
    # canonical / og:url / search action -> /es/ (skip assets)
    s = re.sub(r"https://packagingfactorydirect\.com/(?!assets)", "https://packagingfactorydirect.com/es/", s)
    return s

ATTR_RE = re.compile(r'\b(href|src)="([^"]+)"')

def fix_links(s, depth):
    """depth=0 for es/ root pages, 1 for es/products/ pages."""
    def repl(m):
        name, val = m.group(1), m.group(2)
        if val.startswith(("http://", "https://", "mailto:", "wa.me/", "#", "javascript:")):
            return m.group(0)
        if name == "src" or name == "href":
            # assets
            if val.startswith("assets/"):
                return f'{name}="../{val}"' if depth == 0 else m.group(0)
            if val.startswith("../assets/"):
                return f'{name}="{"../../" + val[3:]}"' if depth == 1 else m.group(0)
            # page links
            P = val
            while P.startswith("../"):
                P = P[3:]
            if P in ROOT_ES:
                prefix = "" if depth == 0 else "../"
                return f'{name}="{prefix}{P}"'
            if P.startswith("products/"):
                base = P.split("/", 1)[1]
                if base in PRODUCTS20:
                    prefix = "" if depth == 0 else ""
                    return f'{name}="{prefix}{P}"'
                else:
                    prefix = "../" if depth == 0 else "../../"
                    return f'{name}="{prefix}{P}"'
            # any other root-relative page (English or industry/...)
            prefix = "../" if depth == 0 else "../../"
            return f'{name}="{prefix}{P}"'
        return m.group(0)
    return ATTR_RE.sub(repl, s)

MAILTO_FIXES = [
    ("subject=Packaging Inquiry", "subject=Consulta de embalaje"),
    ("subject=Packaging RFQ", "subject=RFQ de embalaje"),
    ("body=Hello Linda, this is Xxx who need the (products).", "body=Hola Linda, soy Xxx y necesito (producto)."),
    ("body=Hello Linda, I need custom packaging. Please help with dieline, samples, printing, materials and worldwide shipping.", "body=Hola Linda, necesito embalaje personalizado. Por favor, ayúdame con dieline, muestras, impresión, materiales y envío a todo el mundo."),
    ("text=Hello%20Linda%2C%20I%20need%20custom%20packaging.%20Please%20help%20with%20dieline%2C%20samples%2C%20printing%2C%20materials%20and%20worldwide%20shipping.",
     "text=Hola%20Linda%2C%20necesito%20embalaje%20personalizado.%20Por%20favor%2C%20ay%C3%BAdame%20con%20dieline%2C%20muestras%2C%20impresi%C3%B3n%2C%20materiales%20y%20env%C3%ADo%20a%20todo%20el%20mundo."),
]
WA_PROD_RE = re.compile(r'text=Hello%20Linda%2C%20I%20need%20([^"&]+)')

def fix_contact_hrefs(s):
    for a, b in MAILTO_FIXES:
        s = s.replace(a, b)
    def repl(m):
        prod = urllib.parse.unquote(m.group(1))
        es = DICT.get(prod)
        if es:
            return "text=Hola%20Linda%2C%20necesito%20" + urllib.parse.quote(es, safe="")
        return m.group(0)
    return WA_PROD_RE.sub(repl, s)

SCRIPT_RE = re.compile(r"<script.*?</script>", re.S)

def process(html, depth):
    # protect URLs from the dictionary pass
    html, tokens = protect_urls(html)
    # split scripts from the rest
    parts = []
    last = 0
    for m in SCRIPT_RE.finditer(html):
        parts.append(("html", html[last:m.start()]))
        seg = m.group(0)
        if 'application/ld+json' in seg:
            parts.append(("ld", seg))
        else:
            parts.append(("keep", seg))
        last = m.end()
    parts.append(("html", html[last:]))
    out = []
    for kind, seg in parts:
        if kind == "html":
            out.append(translate_text(seg))
        elif kind == "ld":
            out.append(fix_jsonld(seg))
        else:
            out.append(seg)
    s = "".join(out)
    s = restore_urls(s, tokens)
    # structural
    s = s.replace('lang="en"', 'lang="es"', 1)
    s = s.replace('<meta content="English" name="language"/>', '<meta content="es" name="language"/>')
    s = s.replace("■/span>", "■</span>")
    s = s.replace("▱/span>", "▱</span>")
    s = fix_urls(s)
    s = fix_links(s, depth)
    s = fix_contact_hrefs(s)
    return s

# ---------- source file list ----------
SOURCES = [
    ("index.html", 0), ("products.html", 0), ("contact.html", 0),
    ("products/custom-packaging-boxes.html", 1),
    ("products/custom-gift-boxes.html", 1),
    ("products/custom-magnetic-gift-box-gold-foil-logo.html", 1),
    ("products/luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html", 1),
    ("products/stand-up-pouches.html", 1),
    ("products/custom-coffee-bags.html", 1),
    ("products/pet-food-stand-up-pouches.html", 1),
    ("products/food-packaging-boxes.html", 1),
    ("products/pharmaceutical-packaging-boxes.html", 1),
    ("products/cosmetic-packaging-boxes.html", 1),
    ("products/food-containers.html", 1),
    ("products/custom-paper-bags.html", 1),
    ("products/custom-shipping-boxes.html", 1),
    ("products/bubble-mailers.html", 1),
    ("products/custom-courier-bags.html", 1),
    ("products/custom-tin-boxes.html", 1),
    ("products/pet-food-pharma-bottles.html", 1),
    ("products/custom-tissue-paper.html", 1),
    ("products/custom-cards-playing-cards.html", 1),
    ("products/custom-takeaway-boxes-wholesale-eco-friendly-logo-printed-disposable-food-packaging-boxes-manufacturer.html", 1),
]

def read_source(rel):
    """Read source HTML. products.html contains invalid UTF-8 bytes in the repo
    (corrupted logo mark + en-dash); repair them IN MEMORY only, never on disk."""
    with open(os.path.join(BASE, rel), "rb") as f:
        data = f.read()
    data = data.replace(b"\xe2\x96\x3f", "\u25f1".encode("utf-8"))   # logo mark
    data = data.replace(b"\xe2\x80\x3f", "\u2013".encode("utf-8"))   # en dash
    return data.decode("utf-8")

def main():
    os.makedirs(os.path.join(OUT, "products"), exist_ok=True)
    # clean previous outputs
    for root, _dirs, files in os.walk(OUT):
        for fn in files:
            os.remove(os.path.join(root, fn))
    results = []
    for rel, depth in SOURCES:
        html = read_source(rel)
        es = process(html, depth)
        dst = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(es)
        results.append((rel, len(es)))
    for rel, n in results:
        print(f"OK {rel} ({n} chars)")
    print("TOTAL:", len(results))

if __name__ == "__main__":
    main()
