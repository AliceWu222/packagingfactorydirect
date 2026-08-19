import json
d=json.load(open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_extracted.json",encoding="utf-8"))
with open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_strings.txt","w",encoding="utf-8") as f:
    for e in d:
        t=e["text"].replace("\n"," ")
        f.write(f"{e['kind']}\t{t}\t[{len(e['files'])}]\n")
print("done", len(d))
