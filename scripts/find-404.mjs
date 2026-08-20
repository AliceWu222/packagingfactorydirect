import https from "https";
const BASE = "https://www.packagingfactorydirect.com";
const UA = "Mozilla/5.0 (compatible; PFD-404Scan/1.0)";
function fetchUrl(u, redirects = 3) {
  return new Promise((resolve) => {
    const req = https.get(u, { headers: { "User-Agent": UA } }, (res) => {
      const chunks = [];
      res.on("data", (c) => { if (Buffer.concat(chunks).length < 900000) chunks.push(c); });
      res.on("end", () => {
        const d = Buffer.concat(chunks).toString("utf8");
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          return fetchUrl(new URL(res.headers.location, u).toString(), redirects - 1).then(resolve);
        }
        resolve({ status: res.statusCode, body: d });
      });
      res.on("error", (e) => resolve({ err: e.message }));
    });
    req.on("error", (e) => resolve({ err: e.message }));
    req.setTimeout(20000, () => { try { req.destroy(); } catch {} resolve({ err: "timeout" }); });
  });
}
async function xmlLocs(url) {
  const r = await fetchUrl(url);
  if (r.err || r.status !== 200) return [];
  return [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
}
const index = await xmlLocs(`${BASE}/sitemap-index.xml`);
const all = new Set();
for (const sub of index) (await xmlLocs(sub)).forEach(l => all.add(l));
const list = [...all];
console.log(`checking ${list.length} sitemap URLs for 404...`);
const bad = [];
for (let i = 0; i < list.length; i++) {
  const r = await fetchUrl(list[i]);
  if (r.err || r.status === 404) bad.push({ url: list[i], status: r.status || r.err });
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${list.length}`);
}
console.log(`\n404 count: ${bad.length}`);
bad.forEach(b => console.log(`  404 ${b.url.replace(BASE, "")} (${b.status})`));
