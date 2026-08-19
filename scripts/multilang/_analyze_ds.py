import json, re
d=json.load(open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_extracted2.json",encoding="utf-8"))
ds=[e["text"] for e in d if e["kind"]=="ATTR:data-search"]
print("count:", len(ds))
# pattern analysis: how many contain '|' or '. ' segments
from collections import Counter
tail_words=Counter()
for s in ds:
    # split on '. ' -> first part = title+desc; tail = keywords
    parts=s.split(". ")
    tail=parts[1] if len(parts)>1 else ""
    for kw in tail.split(", "):
        kw=kw.strip()
        if kw:
            tail_words[kw]+=1
print("unique keyword phrases:", len(tail_words))
with open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_keywords.txt","w",encoding="utf-8") as f:
    for kw,c in sorted(tail_words.items(), key=lambda x:-x[1]):
        f.write(f"{kw}\t{c}\n")
# show samples
items=sorted(tail_words.items(), key=lambda x:-x[1])
for kw,c in items[:60]:
    print(f"[{c}] {kw}")
