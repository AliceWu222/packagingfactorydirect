import https from "https";
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e.message));
process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e?.message));
function fetch(u) {
  return new Promise((resolve) => {
    const req = https.get(u, { headers: { "User-Agent": "test" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d.slice(0, 100) }));
    });
    req.on("error", (e) => resolve({ err: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ err: "timeout" }); });
  });
}
console.log("start");
const a = await fetch("https://www.packagingfactorydirect.com/sitemap-index.xml");
console.log("index:", a.status, a.err || a.body.slice(0, 50));
const b = await fetch("https://www.packagingfactorydirect.com/");
console.log("home:", b.status, b.err || b.body.slice(0, 50));
console.log("done");
