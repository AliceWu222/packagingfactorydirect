import https from "https";
const urls = ["/de/index.html", "/de", "/de/", "/fr/index.html", "/fr", "/ar/index.html", "/ar"];
let done = 0;
for (const p of urls) {
  https.get("https://www.packagingfactorydirect.com" + p, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      let canon = "", hreflangDe = "";
      if (res.statusCode === 200) {
        canon = (d.match(/rel="canonical"[^>]*href="([^"]+)"/) || [])[1] || "?";
        hreflangDe = (d.match(/hrefLang="de-DE"[^>]*href="([^"]+)"/) || [])[1] || "?";
      }
      console.log(p.padEnd(14), "->", res.statusCode, "loc=" + (res.headers.location || "-"), "canon=" + canon, "de-DE=" + hreflangDe);
      if (++done === urls.length) process.exit(0);
    });
  }).on("error", (e) => { console.log(p, "ERR", e.message); if (++done === urls.length) process.exit(0); });
}
