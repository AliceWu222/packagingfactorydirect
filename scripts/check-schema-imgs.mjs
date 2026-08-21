import https from "https";
const BASE = "https://www.packagingfactorydirect.com";
const UA = "Mozilla/5.0 (compatible; PFD-SchemaCheck/1.0)";
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e.message));
function fetchUrl(u, redirects = 3) {
  return new Promise((resolve) => {
    const req = https.get(u, { headers: { "User-Agent": UA } }, (res) => {
      const chunks = [];
      res.on("data", (c) => { if (Buffer.concat(chunks).length < 900000) chunks.push(c); });
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          return fetchUrl(new URL(res.headers.location, u).toString(), redirects - 1).then(resolve);
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
      res.on("error", (e) => resolve({ err: e.message }));
    });
    req.on("error", (e) => resolve({ err: e.message }));
    req.setTimeout(20000, () => { try { req.destroy(); } catch {} resolve({ err: "timeout" }); });
  });
}
async function xmlLocs(url) {
  const r = await fetchUrl(url);
  if (r.err || r.status !== 200) return [];
  return [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
}
const index = await xmlLocs(`${BASE}/sitemap-index.xml`);
const all = new Set();
for (const sub of index) (await xmlLocs(sub)).forEach(l => all.add(l));
const list = [...all];

// Sample: all EN products (192) + 3 per lang
const enProds = list.filter(u => /\/products\//.test(u) && !/\/(de|fr|es|ja|ar)\//.test(u));
const langProds = [];
for (const l of ["de", "fr", "es", "ja", "ar"]) langProds.push(...list.filter(u => u.includes(`/${l}/products/`)).slice(0, 3));
const sample = [...enProds, ...langProds];
console.log(`checking ${sample.length} product pages for schema + images...`);

let schemaOk = 0, schemaFail = 0, imgOk = 0, imgFail = 0;
const schemaProblems = [];
let checked = 0;
for (const u of sample) {
  const r = await fetchUrl(u);
  checked++;
  if (r.err || r.status !== 200) { console.log("  FAIL", u.replace(BASE, ""), r.err || r.status); continue; }
  const hasProduct = /"@type"\s*:\s*"Product"|"@type":"Product"/.test(r.body) || /"@graph"[\s\S]{0,3000}"Product"/.test(r.body);
  if (hasProduct) schemaOk++; else { schemaFail++; schemaProblems.push(u.replace(BASE, "")); }
  const imgs = [...r.body.matchAll(/<img[^>]*src=["']([^"']+)["']/g)].map(m => m[1]).filter(s => !s.startsWith("data:"));
  let broken = false;
  for (const img of imgs) {
    if (img.startsWith("http")) continue;
    const abs = img.startsWith("/") ? img : "/" + img.replace(/^(\.\.\/)+/, "");
    const st = await fetchUrl(BASE + abs);
    if (st.err || st.status !== 200) { broken = true; console.log("  BROKEN IMG", abs, "on", u.replace(BASE, "")); break; }
  }
  if (broken) imgFail++; else imgOk++;
  if (checked % 40 === 0) console.log(`  ${checked}/${sample.length}`);
}
console.log(`\n=== RESULTS ===`);
console.log(`schema: ${schemaOk} OK, ${schemaFail} missing`);
console.log(`images: ${imgOk} OK, ${imgFail} with broken imgs`);
if (schemaProblems.length) console.log("schema missing on:", schemaProblems.slice(0, 10).join(", "));
