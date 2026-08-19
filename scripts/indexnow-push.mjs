/**
 * IndexNow URL push for packagingfactorydirect.com
 * Pushes URLs to Bing (api.indexnow.org reaches Bing + Yandex + Seznam + Naver).
 * Usage: node scripts/indexnow-push.mjs [urls...]
 *        node scripts/indexnow-push.mjs --all        (scan sitemaps and push every URL)
 *        node scripts/indexnow-push.mjs --new        (push URLs from sitemaps with lastmod within last 14 days)
 */
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const HOST = "www.packagingfactorydirect.com";
const KEY = "9f3c7a2e51b84d60a8c4e1d9f2b7a5c3";
const KEY_LOC = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const SITEMAPS = [
  "https://www.packagingfactorydirect.com/sitemap-index.xml"
];

function fetchText(url) {
  try {
    const out = execSync(`curl.exe -s -L --max-time 30 "${url}"`, { encoding: "utf8", shell: "cmd.exe" });
    return out;
  } catch {
    return "";
  }
}

async function collectSitemapUrls() {
  const urls = new Set();
  for (const s of SITEMAPS) {
    const idx = fetchText(s);
    const subs = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    for (const sub of subs) {
      const xml = fetchText(sub);
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
    }
  }
  return [...urls];
}

async function push(urls, label) {
  if (!urls.length) { console.log(label + ": nothing to push"); return; }
  const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOC, urlList: urls });
  const tmp = `C:/Users/Administrator/AppData/Local/Temp/indexnow-${Date.now()}.json`;
  writeFileSync(tmp, body, "utf8");
  try {
    const out = execSync(`curl.exe -s -o NUL -w "%{http_code}" -X POST -H "Content-Type: application/json; charset=utf-8" --data-binary "@${tmp}" "${ENDPOINT}"`, { encoding: "utf8", shell: "cmd.exe" });
    console.log(label + ": pushed " + urls.length + " URLs -> HTTP " + out.trim());
  } catch (e) {
    console.log(label + ": push failed: " + e.message);
  } finally {
    unlinkSync(tmp);
  }
}

const args = process.argv.slice(2);
if (args.includes("--all")) {
  const urls = await collectSitemapUrls();
  await push(urls, "--all");
} else if (args.includes("--new")) {
  // Push URLs whose <lastmod> is within the last NEW_WINDOW_DAYS days.
  const NEW_WINDOW_DAYS = 14;
  const cutoff = Date.now() - NEW_WINDOW_DAYS * 86400000;
  const urls = new Set();
  for (const s of SITEMAPS) {
    const idx = fetchText(s);
    const subs = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    for (const sub of subs) {
      const xml = fetchText(sub);
      const urlRe = /<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
      for (const m of xml.matchAll(urlRe)) {
        const lastmod = new Date(m[2]);
        if (!isNaN(lastmod) && lastmod.getTime() >= cutoff) urls.add(m[1]);
      }
    }
  }
  await push([...urls], "--new");
} else if (args.length > 0) {
  const urls = args.map(u => (u.startsWith("http") ? u : `https://${HOST}/${u.replace(/^\//, "")}`));
  await push(urls, "manual");
} else {
  console.log("usage: node scripts/indexnow-push.mjs [--all|--new|urls...]");
}
