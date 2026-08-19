import json
d=json.load(open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_extracted2.json",encoding="utf-8"))
with open(r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang\_misc.txt","w",encoding="utf-8") as f:
    for e in d:
        if e["kind"] in ("TEXT:td","TEXT:th","TEXT:i","TEXT:em","TEXT:b","TEXT:small","TEXT:span","TEXT:div","TEXT:a","TEXT:h4","TEXT:option","TEXT:button","TEXT:li"):
            f.write(e["kind"] + "\t" + e["text"] + "\n")
print("ok")
