import json, os, re
from html.parser import HTMLParser

BASE = r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site"

FILES = [
 "index.html", "products.html", "contact.html",
 "products/custom-packaging-boxes.html","products/custom-gift-boxes.html",
 "products/custom-magnetic-gift-box-gold-foil-logo.html","products/luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html",
 "products/stand-up-pouches.html","products/custom-coffee-bags.html","products/pet-food-stand-up-pouches.html",
 "products/food-packaging-boxes.html","products/pharmaceutical-packaging-boxes.html","products/cosmetic-packaging-boxes.html",
 "products/food-containers.html","products/custom-paper-bags.html","products/custom-shipping-boxes.html",
 "products/bubble-mailers.html","products/custom-courier-bags.html","products/custom-tin-boxes.html",
 "products/pet-food-pharma-bottles.html","products/custom-tissue-paper.html","products/custom-cards-playing-cards.html",
 "products/custom-takeaway-boxes-wholesale-eco-friendly-logo-printed-disposable-food-packaging-boxes-manufacturer.html",
]

SKIP_TAGS = {"script","style"}
ATTR_FIELDS = ["alt","placeholder","aria-label","title","data-search","data-global-search"]
META_FIELDS = ["description","og:title","og:description","twitter:title","twitter:description"]

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.records=[]
    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS: return
        d=dict(attrs)
        self.stack.append(tag)
        for k in ATTR_FIELDS:
            if k in d and d[k].strip():
                self.records.append(("ATTR:"+k, d[k].strip()))
        if tag=="meta":
            n=d.get("name") or d.get("property")
            c=d.get("content","")
            if n in META_FIELDS and c.strip():
                self.records.append(("META:"+n, c.strip()))
        if tag=="a":
            h=d.get("href","")
            if h.startswith(("mailto:","https://wa.me/","wa.me/")):
                self.records.append(("HREF:"+("mailto" if "mailto:" in h else "wa"), h))
    def handle_endtag(self, tag):
        if tag in SKIP_TAGS: return
        if self.stack: self.stack.pop()
    def handle_data(self, data):
        if not self.stack or self.stack[-1] in SKIP_TAGS: return
        t=data.strip()
        if t:
            path="/".join(self.stack)
            self.records.append(("TEXT:"+self.stack[-1], t, path))

def extract(fname):
    with open(os.path.join(BASE,fname), encoding="utf-8") as f:
        html=f.read()
    p=TextExtractor()
    p.feed(html)
    recs=[]
    for r in p.records:
        if r[0].startswith("TEXT:"):
            recs.append((r[0], r[1], r[2]))
        else:
            recs.append((r[0], r[1], ""))
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            o=json.loads(m.group(1))
        except Exception:
            continue
        def walk(x):
            if isinstance(x,dict):
                for k in ("name","description","category"):
                    if k in x and isinstance(x[k],str) and x[k].strip():
                        recs.append(("JSONLD:"+k, x[k].strip(), ""))
                for v in x.values(): walk(v)
            elif isinstance(x,list):
                for v in x: walk(v)
        walk(o)
    return recs

allrecs=[]
for f in FILES:
    for kind,txt,path in extract(f):
        allrecs.append((f,kind,txt,path))

uniq={}
for f,kind,txt,path in allrecs:
    key=(kind,txt)
    if key not in uniq:
        uniq[key]={"files":set(),"paths":set()}
    uniq[key]["files"].add(f)
    if path: uniq[key]["paths"].add(path)

out=[]
for (k,t),info in sorted(uniq.items(), key=lambda x:x[0][1].lower()):
    out.append({"kind":k,"text":t,"files":sorted(info["files"]),"n":len(info["files"]),"paths":sorted(info["paths"])[:3]})
with open(os.path.join(BASE,"scripts","multilang","_extracted2.json"),"w",encoding="utf-8") as f:
    json.dump(out,f,ensure_ascii=False,indent=1)

kinds={}
for e in out: kinds[e["kind"]]=kinds.get(e["kind"],0)+1
print("Total unique:", len(out))
for k in sorted(kinds): print(k, kinds[k])
