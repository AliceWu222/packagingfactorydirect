import https from "https";
const urls = [
  ["/de/", "de"],
  ["/fr/", "fr"],
  ["/es/", "es"],
  ["/ja/", "ja"],
  ["/ar/", "ar"],
  ["/de/products/custom-paper-bags.html", "de"],
  ["/ar/products/custom-paper-bags.html", "ar"]
];
function get(u) {
  return new Promise((resolve) => {
    https.get("https://www.packagingfactorydirect.com" + u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    }).on("error", (e) => resolve({ err: e.message }));
  });
}
for (const [u, expectLang] of urls) {
  const r = await get(u);
  if (r.err) { console.log(u, "ERR", r.err); continue; }
  const lang = r.body.match(/<html[^>]*lang="([^"]+)"/)?.[1] || "?";
  const dir = r.body.match(/<html[^>]*dir="([^"]+)"/)?.[1] || "";
  const marker = r.headers["x-pfd-lang"] || "";
  console.log(u, "->", r.status, "lang=" + lang, "dir=" + dir, "edge-marker=" + marker, lang === expectLang ? "PASS" : "FAIL");
}
