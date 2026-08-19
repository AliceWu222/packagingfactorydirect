import os, re, json
base=r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site"

# 1) Breadcrumb JSON-LD in the 20 product files
files=["products/custom-packaging-boxes.html","products/custom-gift-boxes.html","products/custom-magnetic-gift-box-gold-foil-logo.html","products/luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html","products/stand-up-pouches.html","products/custom-coffee-bags.html","products/pet-food-stand-up-pouches.html","products/food-packaging-boxes.html","products/pharmaceutical-packaging-boxes.html","products/cosmetic-packaging-boxes.html","products/food-containers.html","products/custom-paper-bags.html","products/custom-shipping-boxes.html","products/bubble-mailers.html","products/custom-courier-bags.html","products/custom-tin-boxes.html","products/pet-food-pharma-bottles.html","products/custom-tissue-paper.html","products/custom-cards-playing-cards.html","products/custom-takeaway-boxes-wholesale-eco-friendly-logo-printed-disposable-food-packaging-boxes-manufacturer.html"]
print("=== Breadcrumb in 20-set ===")
for f in files:
    s=open(os.path.join(base,f),encoding="utf-8").read()
    if "Breadcrumb" in s: print("BREADCRUMB in", f)

# 2) hub anchors in products.html
print("=== hub anchors ===")
s=open(os.path.join(base,"products.html"),encoding="utf-8").read()
start=s.find('buyer-solution-hubs'); end=s.find('</section>', start)
seg=s[start:end+9]
seen=set()
for m in re.finditer(r'<a href="([^"]+)"[^>]*>(.*?)</a>', seg, re.S):
    h=m.group(1); t=re.sub(r'<[^>]+>','',m.group(2)).strip()
    if h not in seen:
        seen.add(h); print(h, "|", t[:60])

# 3) all unique relative hrefs in the 20 product files (to know link targets)
print("=== all relative hrefs in 20 product files ===")
allh=set()
for f in files:
    s=open(os.path.join(base,f),encoding="utf-8").read()
    for m in re.finditer(r'<a href="([^"]+)"', s):
        h=m.group(1)
        if not h.startswith(("http","mailto","wa.me","#")):
            allh.add(h)
for h in sorted(allh): print(h)
