import https from "https";
const BASE = "https://www.packagingfactorydirect.com";
const UA = "Mozilla/5.0 (compatible; PFD-DeepScan/1.0)";
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e.message));

function fetchUrl(u, redirects = 5) {
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
    req.setTimeout(25000, () => { try { req.destroy(); } catch {} resolve({ err: "timeout" }); });
  });
}

async function xmlLocs(url) {
  const r = await fetchUrl(url);
  if (r.err || r.status !== 200) return { error: r.err || r.status };
  return { locs: [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]) };
}

// Collect all URLs
const index = await xmlLocs(`${BASE}/sitemap-index.xml`);
const allUrls = new Set();
for (const sub of index.locs) {
  const r = await xmlLocs(sub);
  if (r.locs) r.locs.forEach(l => allUrls.add(l));
}
const urlList = [...allUrls];
console.log(`total sitemap URLs: ${urlList.length}`);

// Categories
const en = urlList.filter(u => !/\/(de|fr|es|ja|ar)\//.test(u));
const langs = { de: [], fr: [], es: [], ja: [], ar: [] };
for (const u of urlList) {
  const m = u.match(/\/(de|fr|es|ja|ar)\//);
  if (m) langs[m[1]].push(u);
}
console.log(`EN: ${en.length}, DE: ${langs.de.length}, FR: ${langs.fr.length}, ES: ${langs.es.length}, JA: ${langs.ja.length}, AR: ${langs.ar.length}`);

// 1. Language parity check: EN products vs lang products
const enProducts = en.filter(u => /\/products\//.test(u));
const enPages = en.filter(u => !/\/products\//.test(u) && !/\/blog\//.test(u) && !/\/news\//.test(u));
console.log(`\nEN products: ${enProducts.length}, EN pages: ${enPages.length}`);
for (const [lang, urls] of Object.entries(langs)) {
  const prods = urls.filter(u => /\/products\//.test(u));
  const pages = urls.filter(u => !/\/products\//.test(u));
  console.log(`${lang}: products=${prods.length}, pages=${pages.length}`);
}

// 2. Internal link integrity: sample pages, extract hrefs, check against known URLs
console.log("\n--- INTERNAL LINK CHECK (sample 30 pages) ---");
const sample = [...en.slice(0, 15), ...urlList.filter(u => /\/products\//.test(u) && !/\/(de|fr|es|ja|ar)\//.test(u)).slice(0, 5), ...langs.de.slice(0, 3), ...langs.ar.slice(0, 3), ...langs.ja.slice(0, 2), ...langs.fr.slice(0, 2)];
const knownSet = new Set(urlList.map(u => u.replace(BASE, "")));
const linkIssues = [];
for (const u of sample) {
  const r = await fetchUrl(u);
  if (r.err || r.status !== 200) { linkIssues.push({ page: u, type: "PAGE_FAIL", detail: r.err || r.status }); continue; }
  if (!(r.headers["content-type"] || "").includes("text/html")) continue;
  const hrefs = [...r.body.matchAll(/href=["']([^"']+)["']/g)].map(m => m[1]);
  const internal = hrefs
    .filter(h => h.startsWith("/") || h.startsWith(BASE) || h.startsWith("./") || h.startsWith("../"))
    .map(h => h.replace(BASE, "").split("#")[0].split("?")[0])
    .filter(h => h.length > 1 && !h.startsWith("/_next") && !h.startsWith("/assets") && !h.endsWith(".webp") && !h.endsWith(".png") && !h.endsWith(".jpg") && !h.endsWith(".ico") && !h.endsWith(".txt") && !h.endsWith(".xml") && !h.endsWith(".json") && !h.endsWith(".js") && !h.endsWith(".css"));
  const seen = new Set();
  for (const h of internal) {
    if (seen.has(h)) continue;
    seen.add(h);
    // Resolve relative
    let resolved = h;
    if (h.startsWith("../")) {
      const depth = (u.replace(BASE, "").match(/\//g) || []).length - 1;
      let p = u.replace(BASE, "");
      for (let i = 0; i < depth; i++) p = p.substring(0, p.lastIndexOf("/"));
      resolved = p + "/" + h.replace(/^(\.\.\/)+/, "");
    } else if (h.startsWith("./")) {
      const dir = u.replace(BASE, "").substring(0, u.replace(BASE, "").lastIndexOf("/") + 1);
      resolved = dir + h.replace(/^\.\//, "");
    }
    const known = knownSet.has(resolved) || knownSet.has(resolved + ".html") || knownSet.has(resolved.replace(/\/$/, ""));
    if (!known && !resolved.startsWith("/de/") && !resolved.startsWith("/fr/") && !resolved.startsWith("/es/") && !resolved.startsWith("/ja/") && !resolved.startsWith("/ar/")) {
      // suspicious: check a sample of unknown links
      linkIssues.push({ page: u, type: "UNKNOWN_LINK", detail: resolved.slice(0, 90) });
    }
  }
}
const unknownByType = {};
linkIssues.forEach(i => { unknownByType[i.type] = (unknownByType[i.type] || 0) + 1; });
console.log("link issues:", JSON.stringify(unknownByType));
linkIssues.slice(0, 25).forEach(i => console.log(`  [${i.type}] ${i.page.replace(BASE,"")} -> ${i.detail}`));

// 3. Structured data + image check on all EN products (sampled) + lang products (sampled)
console.log("\n--- SCHEMA & IMAGE CHECK (product pages) ---");
const prodSample = [...enProducts.slice(0, 10), ...langs.de.slice(0, 3), ...langs.fr.slice(0, 3), ...langs.es.slice(0, 3), ...langs.ja.slice(0, 3), ...langs.ar.slice(0, 3)];
let schemaOk = 0, schemaFail = 0, imgOk = 0, imgFail = 0;
const schemaProblems = [];
for (const u of prodSample) {
  const r = await fetchUrl(u);
  if (r.err || r.status !== 200) continue;
  const hasProduct = /"@type"\s*:\s*"Product"|"@type":"Product"/.test(r.body) || /"@graph"[\s\S]{0,2000}"Product"/.test(r.body);
  if (hasProduct) schemaOk++; else { schemaFail++; schemaProblems.push(u.replace(BASE, "")); }
  const imgs = [...r.body.matchAll(/<img[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
  for (const img of imgs) {
    if (img.startsWith("data:") || img.startsWith("http")) continue;
    const abs = img.startsWith("/") ? img : "/" + img.replace(/^(\.\.\/)+/, "");
    const st = await fetchUrl(BASE + abs);
    if (st.err || st.status !== 200) { imgFail++; break; }
  }
  imgOk++;
}
console.log(`schema: ${schemaOk}/${prodSample.length} OK, images: ${imgFail === 0 ? "ALL OK" : imgFail + " broken"}`);
if (schemaProblems.length) console.log("schema missing:", schemaProblems.slice(0, 8).join(", "));

// 4. Page experience: lang pages title/h1 checks
console.log("\n--- LANG PAGE TITLE/H1 ---");
for (const [lang, urls] of Object.entries(langs)) {
  const home = urls.find(u => u.endsWith(`/${lang}/`)) || urls[0];
  const r = await fetchUrl(home);
  if (r.err || r.status !== 200) { console.log(`${lang}: FAIL ${r.err || r.status}`); continue; }
  const title = (r.body.match(/<title>([^<]{0,80})<\/title>/) || [])[1] || "?";
  const h1 = (r.body.match(/<h1[\s>]/g) || []).length;
  console.log(`${lang}: h1=${h1} title="${title.slice(0, 60)}"`);
}
console.log("\nDONE");
