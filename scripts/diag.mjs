import https from "https";
function raw(u) {
  return new Promise((resolve) => {
    https.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, loc: res.headers.location, cc: res.headers["cache-control"], age: res.headers.age, xv: res.headers["x-vercel-cache"], marker: res.headers["x-pfd-lang"], body: d.slice(0, 300) }));
    }).on("error", (e) => resolve({ err: e.message }));
  });
}
for (const u of [
  "https://www.packagingfactorydirect.com/de/",
  "https://www.packagingfactorydirect.com/de/products/custom-paper-bags.html",
  "https://www.packagingfactorydirect.com/de/index.html"
]) {
  const r = await raw(u);
  console.log("\n" + u);
  console.log("  status=", r.status, "loc=", r.loc, "cc=", r.cc, "age=", r.age, "xvc=", r.xv, "marker=", r.marker);
}
