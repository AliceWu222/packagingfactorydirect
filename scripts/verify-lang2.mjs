import https from "https";
const urls = [
  ["/de/index.html", "de", ""],
  ["/fr/index.html", "fr", ""],
  ["/es/index.html", "es", ""],
  ["/ja/index.html", "ja", ""],
  ["/ar/index.html", "ar", "rtl"],
  ["/de/products/custom-paper-bags.html", "de", ""],
  ["/ar/products/custom-paper-bags.html", "ar", "rtl"]
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
let pass = 0, fail = 0;
for (const [u, expectLang, expectDir] of urls) {
  const r = await get(u);
  if (r.err) { console.log(u, "ERR", r.err); fail++; continue; }
  const lang = r.body.match(/<html[^>]*lang="([^"]+)"/)?.[1] || "?";
  const dir = r.body.match(/<html[^>]*dir="([^"]+)"/)?.[1] || "";
  const marker = r.headers["x-pfd-lang"] || "";
  const ok = lang === expectLang && dir === expectDir && marker === expectLang;
  if (ok) pass++; else fail++;
  console.log(u, "->", r.status, "lang=" + lang, "dir=" + dir, "marker=" + marker, ok ? "PASS" : "FAIL");
}
console.log("\n" + pass + " pass, " + fail + " fail");
