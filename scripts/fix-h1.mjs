import { readFileSync, writeFileSync } from "fs";
const f = process.argv[2];
let html = readFileSync(f, "utf8");
// Desktop hero: slides 2..5 each contain an <h1>. Convert the 2nd-5th occurrences
// (inside .slide) to <h2> keeping everything else byte-identical.
const headings = [
  "<h1>Custom Packaging Manufacturer for Global B2B Buyers</h1>",
  "<h1>Flexible Packaging &amp; Stand Up Pouches Manufacturer</h1>",
  "<h1>Luxury Boxes, Paper Bags &amp; Premium Print</h1>",
  "<h1>Food Packaging Solutions for Restaurants &amp; Brands</h1>",
  "<h1>Pharma &amp; Medical Packaging with Traceability</h1>"
];
let changed = 0;
for (let idx = 1; idx < headings.length; idx++) {
  const h = headings[idx];
  if (html.includes(h)) {
    html = html.replace(h, h.replace("<h1>", "<h2>").replace("</h1>", "</h2>"));
    changed++;
  }
}
writeFileSync(f, html, "utf8");
const h1Count = (html.match(/<h1>/g) || []).length;
const h2Count = (html.match(/<h2>/g) || []).length;
console.log(JSON.stringify({ changed, h1Count, h2Count }));
