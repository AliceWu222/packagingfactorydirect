# -*- coding: utf-8 -*-
import os, re, json

BASE = r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site"
OUT = os.path.join(BASE, "es")
FILES = ["index.html","products.html","contact.html",
 "products/custom-packaging-boxes.html","products/custom-gift-boxes.html",
 "products/custom-magnetic-gift-box-gold-foil-logo.html","products/luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html",
 "products/stand-up-pouches.html","products/custom-coffee-bags.html","products/pet-food-stand-up-pouches.html",
 "products/food-packaging-boxes.html","products/pharmaceutical-packaging-boxes.html","products/cosmetic-packaging-boxes.html",
 "products/food-containers.html","products/custom-paper-bags.html","products/custom-shipping-boxes.html",
 "products/bubble-mailers.html","products/custom-courier-bags.html","products/custom-tin-boxes.html",
 "products/pet-food-pharma-bottles.html","products/custom-tissue-paper.html","products/custom-cards-playing-cards.html",
 "products/custom-takeaway-boxes-wholesale-eco-friendly-logo-printed-disposable-food-packaging-boxes-manufacturer.html"]

EN_PATTERNS = [
    r"\bHome\b", r"\bProducts\b", r"\bContact Us\b", r"\bAbout Us\b", r"\bNews\b",
    r"Request A Quote", r"OEM & Customize\b", r"MOQ 500 PCS\b", r"\bFactory Direct\b",
    r"Custom Packaging", r"Paper Boxes", r"Stand Up Pouches", r"Pharma Boxes",
    r"Luxury Packaging", r"Get RFQ Quote", r"View Products", r"\bSearch\b", r"\bMenu\b",
    r"\| OEM Custom Packaging", r"Custom Packaging Boxes", r"Custom Gift Boxes",
    r"Custom Paper Bags", r"Bubble Mailers", r"Tin Boxes", r"Shipping Boxes",
    r"Request Factory Quote", r"AI Buyer Snapshot", r"Related Custom Packaging Products",
    r"Worldwide Shipping", r"OEM / ODM", r"MOQ PCS", r"RFQ Response", r"Product Lines",
    r"Customizable", r"Shipping Support", r"Need Custom Packaging", r"Fast Factory Quote",
    r"Chat on WhatsApp", r"Email Inquiry", r"Online Chat", r"Address: Printing Industrial Park",
    r"All custom products", r"No retail price", r"500 PCS", r"main image",
]

def check(fname):
    p = os.path.join(OUT, fname)
    s = open(p, encoding="utf-8").read()
    issues = []
    if 'lang="es"' not in s.split(">", 2)[1][:60] and 'lang="es"' not in s[:200]:
        issues.append("NO lang=es")
    m = re.search(r"<title>(.*?)</title>", s)
    if m:
        t = m.group(1)
        if "| OEM" in t or re.search(r"[A-Za-z]{4,} [A-Za-z]{3,} [A-Za-z]{3,} \|", t) and "MOQ 500 PCS" in t:
            issues.append("title may be English: " + t[:80])
        if len(t) > 60:
            issues.append(f"title len {len(t)} > 60: {t[:70]}")
    else:
        issues.append("NO title")
    canon = re.search(r'<link href="([^"]+)" rel="canonical"/>', s)
    if canon:
        c = canon.group(1)
        expect = "https://www.packagingfactorydirect.com/es/" if fname == "index.html" else "https://www.packagingfactorydirect.com/es/" + fname
        if c != expect:
            issues.append(f"canonical {c} != {expect}")
    else:
        issues.append("NO canonical")
    # asset path check
    if fname.startswith("products/"):
        if "../assets/" in s or '="assets/' in s:
            issues.append("wrong asset path in product page (should be ../../assets/)")
        if "src=\"../assets/" in s:
            issues.append("found ../assets/ in product page")
    else:
        if 'src="assets/' in s or 'href="assets/' in s:
            issues.append("root page uses assets/ (should be ../assets/)")
        if "src=\"../assets/" not in s:
            issues.append("root page missing ../assets/")
    # leftover English
    body = re.sub(r"<script.*?</script>", "", s, flags=re.S)
    body = re.sub(r"data-search=\"[^\"]*\"", "", body)
    for pat in EN_PATTERNS:
        if re.search(pat, body):
            issues.append("EN? " + pat)
    # JSON-LD validity
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', s, re.S):
        try:
            json.loads(m.group(1))
        except Exception as e:
            issues.append("JSON-LD broken: " + str(e)[:60])
    return issues

total = 0
for f in FILES:
    issues = check(f)
    total += len(issues)
    status = "OK " if not issues else "ISSUES"
    print(f"{status} {f}")
    for i in issues[:12]:
        print("    -", i)
print("TOTAL issues:", total)
