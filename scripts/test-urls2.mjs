import https from "https";
const urls = [
  "https://www.packagingfactorydirect.com/de/",
  "https://www.packagingfactorydirect.com/fr/",
  "https://www.packagingfactorydirect.com/es/",
  "https://www.packagingfactorydirect.com/ja/",
  "https://www.packagingfactorydirect.com/ar/",
  "https://www.packagingfactorydirect.com/de/products/custom-paper-bags.html",
  "https://www.packagingfactorydirect.com/ar/products/custom-paper-bags.html",
  "https://www.packagingfactorydirect.com/materials.html",
  "https://www.packagingfactorydirect.com/finishes.html",
  "https://www.packagingfactorydirect.com/factory.html",
  "https://www.packagingfactorydirect.com/samples.html",
  "https://www.packagingfactorydirect.com/sitemap-pages.xml"
];
function get(u, follow = 3) {
  return new Promise((resolve) => {
    const req = https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && follow > 0 && res.headers.location) {
        res.resume();
        resolve(get(new URL(res.headers.location, u).href, follow - 1));
        return;
      }
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ url: u, status: res.statusCode, finalUrl: res.url || u, len: d.length, body: d }));
    });
    req.on("error", (e) => resolve({ url: u, err: e.message }));
  });
}
for (const u of urls) {
  const r = await get(u);
  if (r.err) { console.log(u, "ERR", r.err); continue; }
  const lang = r.body.match(/<html[^>]*lang="([^"]+)"/)?.[1] || "";
  const dir = r.body.match(/<html[^>]*dir="([^"]+)"/)?.[1] || "";
  const h1 = r.body.includes("<h1") ? "H1" : "";
  const de = r.body.includes("Hersteller") ? "DE-content" : "";
  const ar = r.body.includes("مصنع") ? "AR-content" : "";
  const sample = u.includes("sitemap") ? " de=" + (r.body.match(/\/de\//g) || []).length + " fr=" + (r.body.match(/\/fr\//g) || []).length + " ja=" + (r.body.match(/\/ja\//g) || []).length : "";
  console.log(u, "->", r.status, "len=" + r.len, "lang=" + lang, "dir=" + dir, h1, de, ar, sample);
}
