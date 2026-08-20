import https from "https";
import http from "http";

const BASE = "https://www.packagingfactorydirect.com";
const UA = "Mozilla/5.0 (compatible; PFD-SiteCheck/1.0)";
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e.message));
process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e?.message));

function fetchUrl(u, redirects = 5) {
  return new Promise((resolve) => {
    const lib = u.startsWith("https") ? https : http;
    const req = lib.get(u, { headers: { "User-Agent": UA } }, (res) => {
      const chunks = [];
      res.on("data", (c) => { if (Buffer.concat(chunks).length < 700000) chunks.push(c); });
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          const next = new URL(res.headers.location, u).toString();
          return fetchUrl(next, redirects - 1).then(resolve);
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
      res.on("error", (e) => resolve({ err: e.message }));
    });
    req.on("error", (e) => resolve({ err: e.message }));
    req.setTimeout(25000, () => { try { req.destroy(); } catch {} resolve({ err: "timeout" }); });
  });
}

async function xmlLocs(url) {
  const r = await fetchUrl(url);
  if (r.err || r.status !== 200) return { error: r.err || r.status };
  return { locs: [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]) };
}

// 1. Collect all sitemap URLs
const index = await xmlLocs(`${BASE}/sitemap-index.xml`);
const allUrls = new Set();
for (const sub of index.locs) {
  const r = await xmlLocs(sub);
  if (r.locs) r.locs.forEach(l => allUrls.add(l));
}
console.log(`sitemap total URLs: ${allUrls.size}`);

const urlList = [...allUrls];
const isProduct = u => /\/products\//.test(u);
const targets = urlList.filter(u => !isProduct(u));
const sampleProducts = isProduct ? urlList.filter(isProduct).slice(0, 40) : [];
const checkList = [...targets, ...sampleProducts];
console.log(`checking ${checkList.length} URLs (all pages/blog/news + 40 product sample)`);

const issues = [];
const statusCount = {};
let done = 0;
for (const u of checkList) {
  const r = await fetchUrl(u);
  done++;
  statusCount[r.status || "ERR"] = (statusCount[r.status || "ERR"] || 0) + 1;
  if (r.err) { issues.push({ url: u, type: "FETCH_ERROR", detail: r.err }); continue; }
  if (r.status !== 200) { issues.push({ url: u, type: "STATUS", detail: `${r.status}` }); continue; }
  if ((r.headers["content-type"] || "").includes("text/html")) {
    const h1s = r.body.match(/<h1[\s>]/g) || [];
    if (h1s.length !== 1) issues.push({ url: u, type: "H1", detail: `h1 count=${h1s.length}` });
    if (!/rel=["']canonical["']/i.test(r.body)) issues.push({ url: u, type: "CANONICAL_MISSING", detail: "no canonical link" });
    if (!/<title>[\s\S]{5,}<\/title>/.test(r.body)) issues.push({ url: u, type: "TITLE", detail: "missing/empty title" });
  }
  if (done % 25 === 0) console.log(`progress ${done}/${checkList.length}`);
}
console.log("status distribution:", JSON.stringify(statusCount));

console.log("\n--- KEY PAGE DEEP CHECKS ---");
const keyPages = ["/", "/products.html", "/contact.html", "/de/", "/ar/", "/materials.html", "/blog/custom-packaging-buyers-guide-2026-china-factory-direct.html"];
for (const kp of keyPages) {
  const r = await fetchUrl(BASE + kp);
  if (r.err || r.status !== 200) { console.log(`FAIL ${kp}: ${r.err || r.status}`); continue; }
  const h1s = (r.body.match(/<h1[\s>]/g) || []).length;
  const hreflangs = (r.body.match(/rel=["']alternate["'][^>]*hreflang=[^>]*>/g) || []).length;
  const jsonld = (r.body.match(/<script[^>]*application\/ld\+json[^>]*>/g) || []).length;
  const lang = (r.body.match(/<html[^>]*lang=["']([^"']+)/) || [])[1] || "?";
  const title = (r.body.match(/<title>([^<]{0,70})<\/title>/) || [])[1] || "?";
  console.log(`${kp}: h1=${h1s} hreflang=${hreflangs} jsonld=${jsonld} lang=${lang} title="${title.slice(0, 50)}"`);
}

const robots = await fetchUrl(`${BASE}/robots.txt`);
const sitemapLines = (robots.body.match(/^Sitemap:/gim) || []).length;
const aiBots = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"].map(b => robots.body.includes(b)).filter(Boolean).length;
console.log(`\nrobots.txt: status=${robots.status} sitemapLines=${sitemapLines} aiBotsAllowed=${aiBots}/5`);

console.log(`\n=== ISSUES (${issues.length}) ===`);
issues.slice(0, 60).forEach(i => console.log(`[${i.type}] ${i.url} — ${i.detail}`));
if (issues.length > 60) console.log(`... and ${issues.length - 60} more`);
