import { readFileSync, writeFileSync } from "fs";
const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";
const f = root + "/certifications.html";
let c = readFileSync(f, "utf8");

// 1. Food-Grade Compliance: append real XNQ test report facts after the existing paragraph.
const foodOld = '<h2>Food-Grade Compliance</h2><p>Food-contact packaging can be produced with food-grade papers and coatings compliant with FDA and EU 1935/2004 frameworks. Migration test reports and material declarations are available on request for applicable products.</p>';
const foodNew = foodOld + '<p><strong>FDA food-contact test report on file:</strong> XNQ Test Report No. <strong>XNO250418226BX2-1</strong> (issued 21 Apr 2025 by Guangzhou Supreme Technology &amp; Testing Service Co., Ltd.) covering PE-based stand-up pouch film — migration testing per selected FDA food-contact requirements. A copy is available to qualified buyers on request.</p><figure style="max-width:420px;margin:12px 0"><img alt="FDA food-contact migration test report for PE stand up pouch film" decoding="async" loading="lazy" src="https://sc02.alicdn.com/kf/A7ffb58764f6e4d03834891c86f7af7c9O.jpg" style="width:100%;height:auto;border:1px solid var(--line);border-radius:8px"/><figcaption style="font-size:12px;color:var(--muted)">XNQ Test Report XNO250418226BX2-1 — PE food-contact film migration testing</figcaption></figure>';
if (c.includes(foodOld)) { c = c.replace(foodOld, foodNew); } else { console.log("FOOD PATTERN NOT FOUND"); }

// 2. FSC-Certified Paper Options: append real FSC license code.
const fscOld = '<h2>FSC-Certified Paper Options</h2><p>FSC-certified paper and board can be specified for boxes, cartons and bags. Confirm availability and certificate documentation when requesting a quote for sustainability-sensitive markets.</p>';
const fscNew = fscOld + '<p><strong>FSC Mix license:</strong> FSC<sup>®</sup> <strong>C144065</strong> — paper from responsible sources. We can print the FSC logo and chain-of-custody reference on boxes, cartons and bags for certified orders (FSC product group confirmation provided with quotation).</p><figure style="max-width:280px;margin:12px 0"><img alt="FSC Mix certificate C144065 — paper from responsible sources" decoding="async" loading="lazy" src="https://sc02.alicdn.com/kf/A16dd06ad0d9742839925b4e916ca4e26r.jpg" style="width:100%;height:auto;border:1px solid var(--line);border-radius:8px"/><figcaption style="font-size:12px;color:var(--muted)">FSC<sup>®</sup> C144065 — Mix label, paper from responsible sources</figcaption></figure>';
if (c.includes(fscOld)) { c = c.replace(fscOld, fscNew); } else { console.log("FSC PATTERN NOT FOUND"); }

writeFileSync(f, c, "utf8");
console.log("certifications.html updated: food=" + c.includes("XNO250418226BX2-1") + " fsc=" + c.includes("C144065"));
