import https from "https";
const urls = [
  ["/", "首页"],
  ["/products.html", "产品列表"],
  ["/thank-you.html", "感谢页"],
  ["/blog/custom-packaging-buyers-guide-2026-china-factory-direct.html", "采购指南"],
  ["/materials.html", "材料枢纽"],
  ["/finishes.html", "工艺枢纽"],
  ["/factory.html", "工厂枢纽"],
  ["/samples.html", "样品枢纽"],
  ["/de/", "德语首页"],
  ["/fr/", "法语首页"],
  ["/es/", "西语首页"],
  ["/ja/", "日语首页"],
  ["/ar/", "阿语首页"],
  ["/sitemap-index.xml", "sitemap索引"],
  ["/robots.txt", "robots"],
  ["/llms.txt", "llms"],
  ["/ai-index.json", "AI索引"],
  ["/9f3c7a2e51b84d60a8c4e1d9f2b7a5c3.txt", "IndexNow key"]
];
function get(u, follow) {
  return new Promise((resolve) => {
    const req = https.get("https://www.packagingfactorydirect.com" + u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        if (follow && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          resolve(get(res.headers.location.replace("https://www.packagingfactorydirect.com", ""), true));
        } else {
          resolve({ status: res.statusCode, cc: res.headers["cache-control"], final: u, body: d });
        }
      });
    });
    req.on("error", (e) => resolve({ err: e.message }));
  });
}
let pass = 0, fail = 0;
for (const [u, name] of urls) {
  const r = await get(u, true);
  if (r.err) { console.log("FAIL", name, u, "ERR", r.err); fail++; continue; }
  const ok = r.status === 200;
  if (ok) pass++; else fail++;
  let extra = "";
  if (u === "/sitemap-index.xml") extra = " urls=" + (r.body.match(/<loc>/g) || []).length;
  if (u === "/robots.txt") extra = " sitemap-lines=" + (r.body.match(/^Sitemap:/gim) || []).length;
  if (u === "/de/" || u === "/ar/") extra = " lang=" + (r.body.match(/<html[^>]*lang="([^"]+)"/)?.[1] || "?") + " h1=" + ((r.body.match(/<h1[^>]*>([^<]{0,60})/) || [])[1] || "?").trim();
  console.log((ok ? "PASS" : "FAIL"), name, u, "->", r.status, "cc=" + (r.cc || "").slice(0, 30) + extra);
}
console.log("\n" + pass + " ok, " + fail + " fail");
