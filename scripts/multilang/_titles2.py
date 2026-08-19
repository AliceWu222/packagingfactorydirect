import json
d=json.load(open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_extracted2.json",encoding="utf-8"))
with open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_titles.txt","w",encoding="utf-8") as f:
    for e in d:
        if e["kind"]=="TEXT:h3":
            f.write(e["text"].replace("\n"," ")+"\n")
print("ok")
