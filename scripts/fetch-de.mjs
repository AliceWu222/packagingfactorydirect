import https from "https";
function get(u) {
  return new Promise((resolve) => {
    https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", (e) => resolve("ERR " + e.message));
  });
}
const h = await get("https://www.packagingfactorydirect.com/de/index.html");
console.log("len", h.length);
console.log("lang", h.match(/<html[^>]*lang="([^"]+)"/)?.[1]);
console.log("title", h.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]?.slice(0, 60));
console.log("canonical", h.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]);
console.log("has DE hero", h.includes("Hersteller"));
console.log("has EN hero", h.includes("Custom Packaging Manufacturer for Global"));
console.log("has x-pfd-content-source", h.match(/name="x-pfd-content-source" content="([^"]+)"/)?.[1]);
