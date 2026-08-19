import { readFileSync, writeFileSync } from "fs";
const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";
const f = root + "/index.html";
let c = readFileSync(f, "utf8");
const old = '</div></section><section class="section" id="high-value-products">';
// The stat bar section ends with </div></section> immediately before high-value-products.
// We insert a certificate badge strip as a NEW section (does not alter the 5 stats).
const badge = '<div class="cert-badges" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center;margin-top:18px"><a href="certifications.html" style="display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:800;color:var(--green);text-decoration:none"><img alt="FSC Mix certificate" decoding="async" loading="lazy" src="https://sc02.alicdn.com/kf/A16dd06ad0d9742839925b4e916ca4e26r.jpg" style="width:26px;height:26px;object-fit:contain"/>FSC\u00ae C144065</a><a href="certifications.html" style="display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:800;color:var(--green);text-decoration:none"><img alt="FDA food-contact test report" decoding="async" loading="lazy" src="https://sc02.alicdn.com/kf/A7ffb58764f6e4d03834891c86f7af7c9O.jpg" style="width:26px;height:26px;object-fit:contain"/>FDA Food-Contact Test Report</a></div></div></section><section class="section" id="high-value-products">';
if (c.includes(old)) {
  c = c.replace(old, badge, 1);
  writeFileSync(f, c, "utf8");
  console.log("trust badges added: fsc=" + c.includes("C144065") + " fda=" + c.includes("XNO250418226BX2-1") + " ...(fda report text on cert page)");
} else {
  console.log("PATTERN NOT FOUND");
}
