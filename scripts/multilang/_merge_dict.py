# -*- coding: utf-8 -*-
import json, sys, importlib.util, os

BASE = r"C:\Users\Administrator\AccioWork\2026-07-18-05-34-49\packagingfactorydirect_site\scripts\multilang"
def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(BASE, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

D = {}
for i in range(1, 7):
    mod = load(f"es_part{i}")
    d = getattr(mod, f"D{i}")
    for k, v in d.items():
        if k in D and D[k] != v:
            print(f"WARN dup {k!r}: {D[k]!r} vs {v!r}")
        D[k] = v
# D6K keyword phrases merged into main dict as well (lowercase tail translation)
D.update(getattr(load("es_part6"), "D6K"))
with open(os.path.join(BASE, "es_dict.json"), "w", encoding="utf-8") as f:
    json.dump(D, f, ensure_ascii=False, indent=0)
print("dict entries:", len(D))

# coverage report
sk = json.load(open(os.path.join(BASE, "_skeleton.json"), encoding="utf-8"))
missing = [k for k in sk if k not in D]
print("missing:", len(missing))
with open(os.path.join(BASE, "_missing.txt"), "w", encoding="utf-8") as f:
    for k in sorted(missing, key=lambda x: (-len(x), x)):
        f.write(k.replace("\n", " ") + "\t" + str(sk[k]) + "\n")
for k in sorted(missing, key=lambda x: (-len(x), x))[:80]:
    print("MISS:", k[:150], "|", sk[k])
