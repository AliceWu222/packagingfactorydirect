import https from "https";
function fetch(u, redirects = 5) {
  return new Promise((resolve) => {
    https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          return fetch(new URL(res.headers.location, u).toString(), redirects - 1).then(resolve);
        }
        resolve({ status: res.statusCode, body: d });
      });
    }).on("error", (e) => resolve({ err: e.message }));
  });
}
for (const p of ["/de/", "/de/index.html", "/fr/index.html", "/", "/products.html"]) {
  const r = await fetch("https://www.packagingfactorydirect.com" + p);
  if (r.err) { console.log(p, "ERR", r.err); continue; }
  const hrefLang = (r.body.match(/rel=["']alternate["'][^>]*hrefLang="([^"]+)"/g) || []);
  const all = (r.body.match(/<link[^>]*alternate[^>]*>/g) || []).slice(0, 8);
  console.log(`\n${p} -> ${r.status}`);
  console.log("  hrefLang links:", hrefLang.length ? hrefLang.join("\n  ") : "NONE");
}
