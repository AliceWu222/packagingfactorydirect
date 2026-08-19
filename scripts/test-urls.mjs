import https from "https";
const urls = [
  "https://www.packagingfactorydirect.com/de/",
  "https://www.packagingfactorydirect.com/de",
  "https://www.packagingfactorydirect.com/de/index.html",
  "https://www.packagingfactorydirect.com/fr/",
  "https://www.packagingfactorydirect.com/es/",
  "https://www.packagingfactorydirect.com/ja/",
  "https://www.packagingfactorydirect.com/ar/"
];
function get(u) {
  return new Promise((resolve) => {
    https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        const lang = d.match(/<html[^>]*lang="([^"]+)"/)?.[1] || "";
        const dir = d.match(/<html[^>]*dir="([^"]+)"/)?.[1] || "";
        const h1 = d.includes("<h1") || d.includes("<h1>");
        resolve({ url: u, status: res.statusCode, len: d.length, lang, dir, h1 });
      });
    }).on("error", (e) => resolve({ url: u, err: e.message }));
  });
}
for (const u of urls) {
  const r = await get(u);
  console.log(r.url, "->", r.status ?? r.err, "len=" + r.len, "lang=" + r.lang, "dir=" + r.dir, "h1=" + r.h1);
}
