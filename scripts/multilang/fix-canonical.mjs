import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";
const LANGS = ["fr", "es"];
const SITE = "https://www.packagingfactorydirect.com";
let total = 0;
for (const lang of LANGS) {
  const langDir = join(root, lang);
  if (!statSync(langDir, { throwIfNoEntry: false })) continue;
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) processFile(p, lang);
    }
  };
  walk(langDir);
}
function processFile(p, lang) {
  let c = readFileSync(p, "utf8");
  const abs = p.replace(/\\/g, "/");
  const rel = abs.replace(root.replace(/\\/g, "/") + "/", "");
  const langRel = rel.startsWith(lang + "/") ? rel.slice(lang.length + 1) : rel;
  const canonical = langRel === "index.html"
    ? `${SITE}/${lang}/`
    : `${SITE}/${lang}/${langRel}`;
  // Replace empty canonical href="" or missing canonical with correct value.
  const re = /(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/i;
  if (re.test(c)) {
    c = c.replace(re, `$1${canonical}$2`);
  } else {
    c = c.replace(/<link[^>]*rel="canonical"[^>]*\/?>/i, `<link href="${canonical}" rel="canonical"/>`);
  }
  writeFileSync(p, c, "utf8");
  total++;
  console.log(rel, "->", canonical);
}
console.log("fixed", total, "files");
