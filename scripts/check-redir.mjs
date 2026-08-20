import https from "https";
const urls = ["https://www.packagingfactorydirect.com/de/", "https://www.packagingfactorydirect.com/de", "https://www.packagingfactorydirect.com/ar/", "https://www.packagingfactorydirect.com/ar"];
for (const u of urls) {
  https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      console.log(u, "->", res.statusCode, "loc=" + res.headers.location, "cc=" + (res.headers["cache-control"] || ""));
      if (res.statusCode === 200) {
        const lang = (d.match(/<html[^>]*lang="([^"]+)"/) || [])[1];
        const canon = (d.match(/rel="canonical"[^>]*href="([^"]+)"/) || [])[1];
        console.log("   lang=" + lang, "canon=" + canon);
      }
    });
  }).on("error", (e) => console.log(u, "ERR", e.message));
}
