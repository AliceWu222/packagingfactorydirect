import https from "https";
function fetch(u) {
  return new Promise((resolve) => {
    https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    }).on("error", (e) => resolve({ err: e.message }));
  });
}
const pages = ["/", "/products.html", "/contact.html", "/materials.html", "/blog/custom-packaging-buyers-guide-2026-china-factory-direct.html", "/products/custom-paper-bags.html"];
for (const p of pages) {
  const r = await fetch("https://www.packagingfactorydirect.com" + p);
  if (r.err) { console.log(p, "ERR"); continue; }
  const blocks = [...r.body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const types = [];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b.trim());
      const arr = Array.isArray(j) ? j : [j];
      for (const item of arr) types.push(item["@type"] || "?");
    } catch (e) { types.push("PARSE_ERROR"); }
  }
  // images check
  const imgs = [...r.body.matchAll(/<img[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
  console.log(`${p}: ${blocks.length} ld+json blocks [${types.join(", ")}] | imgs=${imgs.length}`);
}
