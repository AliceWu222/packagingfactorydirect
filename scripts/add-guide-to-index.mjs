import { readFileSync, writeFileSync } from "fs";
const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";
const f = root + "/ai-index.json";
let data = JSON.parse(readFileSync(f, "utf8"));
if (!Array.isArray(data.blogGuides)) data.blogGuides = [];
const exists = data.blogGuides.some(g => g.url === "blog/custom-packaging-buyers-guide-2026-china-factory-direct.html");
if (!exists) {
  data.blogGuides.push({
    title: "Custom Packaging Buyer's Guide 2026: Sourcing Boxes, Bags & Pouches from a China Factory",
    url: "blog/custom-packaging-buyers-guide-2026-china-factory-direct.html",
    description: "The complete 2026 B2B guide to sourcing custom boxes, pouches, paper bags and labels from a China factory: MOQ 500 PCS, materials, finishes, sampling, FDA/FSC compliance and RFQ checklist.",
    keywords: [
      "custom packaging manufacturer",
      "China packaging factory",
      "MOQ 500 PCS",
      "custom boxes",
      "stand up pouches",
      "paper bags",
      "FDA food contact",
      "FSC certified packaging"
    ]
  });
  data.generatedAt = new Date().toISOString();
  writeFileSync(f, JSON.stringify(data, null, 2), "utf8");
  console.log("guide added to blogGuides, total=" + data.blogGuides.length);
} else {
  console.log("guide already present");
}
