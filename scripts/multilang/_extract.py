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
ATTR_FIELDS = ["alt","placeholder","aria-label","title"]

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.records=[]
        self.cur=None
    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS: return
        d=dict(attrs)
        self.stack.append(tag)
        if tag=="title" or tag in ("h1","h2","h3","h4","p","li","option","button"):
            self.cur={"path":"/".join(self.stack),"text":""}
        for k in ATTR_FIELDS:
            if k in d and d[k].strip():
                self.records.append(("ATTR:"+k, d[k].strip()))
        if tag=="meta":
            n=d.get("name") or d.get("property")
            c=d.get("content","")
            if n in ("description","og:title","og:description","twitter:title","twitter:description","language") and c.strip():
                self.records.append(("META:"+n, c.strip()))
    def handle_endtag(self, tag):
        if tag in SKIP_TAGS: return
        if self.stack: self.stack.pop()
        if self.cur and tag in ("title","h1","h2","h3","h4","p","li","option","button"):
            t=self.cur["text"].strip()
            if t: self.records.append(("TEXT:"+tag, t))
            self.cur=None
    def handle_data(self, data):
        if self.cur is not None:
            self.cur["text"] += data

def extract(fname):
    with open(os.path.join(BASE,fname), encoding="utf-8") as f:
        html=f.read()
    p=TextExtractor()
    p.feed(html)
    recs=p.records
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            o=json.loads(m.group(1))
        except Exception:
            continue
        def walk(x):
            if isinstance(x,dict):
                for k in ("name","description","category"):
                    if k in x and isinstance(x[k],str) and x[k].strip():
                        recs.append(("JSONLD:"+k, x[k].strip()))
                for v in x.values(): walk(v)
            elif isinstance(x,list):
                for v in x: walk(v)
        walk(o)
    return recs

allrecs=[]
for f in FILES:
    for kind,txt in extract(f):
        allrecs.append((f,kind,txt))

uniq={}
for f,kind,txt in allrecs:
    key=(kind,txt)
    uniq.setdefault(key,[]).append(f)

out=[{"kind":k,"text":t,"files":sorted(set(fs)),"n":len(fs)} for (k,t),fs in sorted(uniq.items(), key=lambda x:x[0][1])]
with open(os.path.join(BASE,"scripts","multilang","_extracted.json"),"w",encoding="utf-8") as f:
    json.dump(out,f,ensure_ascii=False,indent=1)

print("Total unique (kind,text):", len(uniq))
kinds={}
for (k,t),fs in uniq.items(): kinds[k]=kinds.get(k,0)+1
print(kinds)
