import json
d=json.load(open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_extracted2.json",encoding="utf-8"))
keepkinds=("TEXT:","ATTR:alt","ATTR:placeholder","ATTR:aria-label","ATTR:title","META:","JSONLD:")
skip=("TEXT:head","ATTR:data-search","HREF:")
keys={}
for e in d:
    k=e["kind"]
    if any(k.startswith(s) for s in skip): continue
    if not any(k.startswith(s) for s in keepkinds): continue
    keys[e["text"]]=e["n"]
# write skeleton json: key -> "" (to fill) but we author separately; this is the checklist
with open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_skeleton.json","w",encoding="utf-8") as f:
    json.dump(keys,f,ensure_ascii=False,indent=0)
print("skeleton keys:", len(keys))
# also dump checklist sorted by length desc for authoring
with open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_checklist.txt","w",encoding="utf-8") as f:
    for k in sorted(keys, key=lambda x:(-len(x), x)):
        f.write(k.replace("\n"," ")+"\t"+str(keys[k])+"\n")
print("checklist written")
