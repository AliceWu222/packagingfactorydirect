import sys
p = sys.argv[1]
out = sys.argv[2] if len(sys.argv)>2 else None
with open(p, encoding="utf-8") as f:
    content = f.read()
# split long lines at tag boundaries for readability
import re
wrapped = re.sub(r">\s*<", ">\n<", content)
lines = wrapped.split("\n")
if out:
    with open(out,"w",encoding="utf-8") as f:
        for ln in lines:
            f.write(ln+"\n")
    print("lines:", len(lines))
else:
    for i,ln in enumerate(lines):
        print(f"{i+1:04d}| {ln}")
