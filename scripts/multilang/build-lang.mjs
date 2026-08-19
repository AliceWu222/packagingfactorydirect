import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { DICT } from "./lang-dict.mjs";

const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";
const SITE = "https://www.packagingfactorydirect.com";
const LANGS = ["de", "ja", "ar"];
const PRODUCTS = [
  "custom-packaging-boxes.html","custom-gift-boxes.html","custom-magnetic-gift-box-gold-foil-logo.html",
  "luxury-rigid-gift-boxes-magnetic-ribbon-eva-inserts.html","stand-up-pouches.html","custom-coffee-bags.html",
  "pet-food-stand-up-pouches.html","food-packaging-boxes.html","pharmaceutical-packaging-boxes.html",
  "cosmetic-packaging-boxes.html","food-containers.html","custom-paper-bags.html","custom-shipping-boxes.html",
  "bubble-mailers.html","custom-courier-bags.html","custom-tin-boxes.html","pet-food-pharma-bottles.html",
  "custom-tissue-paper.html","custom-cards-playing-cards.html","custom-takeaway-boxes-wholesale-eco-friendly-logo-printed-disposable-food-packaging-boxes-manufacturer.html"
];

function read(p) { return existsSync(p) ? readFileSync(p, "utf8") : null; }

// --- Homepage ---
function buildHome(lang, d) {
  const en = read(join(root, "index.html"));
  if (!en) return null;
  let c = en;
  c = c.replace(/<html[^>]*>/, `<html lang="${d.lang}" dir="${d.dir}">`);
  c = c.replace(/<title>[^<]*<\/title>/, `<title>${d.heroTitle}${d.titleSuffix}</title>`);
  // meta description (keep existing generic or set localized)
  c = c.replace(/<meta[^>]*name="description"[^>]*\/?>/, `<meta name="description" content="${d.metaDesc("Verpackungen")}"/>`);
  // topbar
  c = c.replace(/>MOQ 500 PCS[^<]*<\/div>/, `>${d.topbar}</div>`);
  // nav links: Home Products About Us Blog News Contact Us (text only)
  for (const [enK, deV] of [["Home", d.nav.home], ["Products", d.nav.products], ["About Us", d.nav.about], ["Blog", d.nav.blog], ["News", d.nav.news], ["Contact Us", d.nav.contact]]) {
    c = c.replace(new RegExp(`>${enK}</a>`, "g"), `>${deV}</a>`);
  }
  c = c.replace(/>Request A Quote<\/a>/, `>${d.nav.quote}</a>`);
  // hero eyebrow/title (desktop + mobile variants)
  c = c.replace(/FACTORY DIRECT · MOQ 500 PCS/g, d.heroEyebrow);
  c = c.replace(/Custom Packaging Manufacturer for Global B2B Buyers/g, d.heroTitle);
  // CTA buttons
  c = c.replace(/Get RFQ Quote/g, d.ctaRfq).replace(/View Products/g, d.ctaProducts);
  // stats
  c = c.replace(/MOQ 500 PCS/g, d.statMoa).replace(/40\+ Product Lines/g, d.statProducts).replace(/24h RFQ Response/g, d.statRfq).replace(/100% Customizable/g, d.statCustom).replace(/Global Shipping/g, d.statShipping);
  // canonical
  c = c.replace(/<link[^>]*rel="canonical"[^>]*\/?>/, `<link href="${SITE}/${lang}/" rel="canonical"/>`);
  // links to products/ -> lang/products/
  c = c.replace(/href="products\//g, `href="${lang}/products/`);
  // footer contact heading
  c = c.replace(/>Contact<\/h4>/, `>${d.footerContact}</h4>`);
  c = c.replace(/>MOQ<\/h4><p>[^<]*<\/p>/, `>${d.footerMoa}</h4><p>${d.footerMoaText}</p>`);
  c = c.replace(/>Need Custom Packaging\?<\/div>/, `>${d.floatingHead}</div>`);
  return c;
}

// --- Products listing page ---
function buildProducts(lang, d) {
  const en = read(join(root, "products.html"));
  if (!en) return null;
  let c = en;
  c = c.replace(/<html[^>]*>/, `<html lang="${d.lang}" dir="${d.dir}">`);
  const listTitle = lang === "de" ? "Kundenspezifische Verpackungsprodukte" : lang === "ja" ? "カスタムパッケージ製品" : "منتجات التغليف المخصصة";
  c = c.replace(/<title>[^<]*<\/title>/, `<title>${listTitle}${d.titleSuffix}</title>`);
  c = c.replace(/<meta[^>]*name="description"[^>]*\/?>/, `<meta name="description" content="${d.metaDesc("Verpackungsprodukte")}"/>`);
  c = c.replace(/>MOQ 500 PCS[^<]*<\/div>/, `>${d.topbar}</div>`);
  for (const [enK, deV] of [["Home", d.nav.home], ["Products", d.nav.products], ["About Us", d.nav.about], ["Blog", d.nav.blog], ["News", d.nav.news], ["Contact Us", d.nav.contact]]) {
    c = c.replace(new RegExp(`>${enK}</a>`, "g"), `>${deV}</a>`);
  }
  c = c.replace(/>Request A Quote<\/a>/, `>${d.nav.quote}</a>`);
  c = c.replace(/<link[^>]*rel="canonical"[^>]*\/?>/, `<link href="${SITE}/${lang}/products.html" rel="canonical"/>`);
  // internal product links -> localized
  for (const prod of PRODUCTS) {
    c = c.replace(new RegExp(`href="products/${prod.replace(/\./g, "\\.")}"`, "g"), `href="${lang}/products/${prod}"`);
  }
  return c;
}

// --- Contact page ---
function buildContact(lang, d) {
  const en = read(join(root, "contact.html"));
  if (!en) return null;
  let c = en;
  c = c.replace(/<html[^>]*>/, `<html lang="${d.lang}" dir="${d.dir}">`);
  const ct = lang === "de" ? "Kontakt" : lang === "ja" ? "お問い合わせ" : "اتصل بنا";
  c = c.replace(/<title>[^<]*<\/title>/, `<title>${ct}${d.titleSuffix}</title>`);
  c = c.replace(/<meta[^>]*name="description"[^>]*\/?>/, `<meta name="description" content="${d.metaDesc("Kontakt")}"/>`);
  c = c.replace(/>MOQ 500 PCS[^<]*<\/div>/, `>${d.topbar}</div>`);
  for (const [enK, deV] of [["Home", d.nav.home], ["Products", d.nav.products], ["About Us", d.nav.about], ["Blog", d.nav.blog], ["News", d.nav.news], ["Contact Us", d.nav.contact]]) {
    c = c.replace(new RegExp(`>${enK}</a>`, "g"), `>${deV}</a>`);
  }
  c = c.replace(/>Request A Quote<\/a>/, `>${d.nav.quote}</a>`);
  c = c.replace(/<link[^>]*rel="canonical"[^>]*\/?>/, `<link href="${SITE}/${lang}/contact.html" rel="canonical"/>`);
  return c;
}

// --- Product pages ---
function buildProduct(lang, d, prodFile) {
  const en = read(join(root, "products", prodFile));
  if (!en) return null;
  const title = d.productTitles[prodFile] || prodFile.replace(/\.html$/, "");
  let c = en;
  c = c.replace(/<html[^>]*>/, `<html lang="${d.lang}" dir="${d.dir}">`);
  c = c.replace(/<title>[^<]*<\/title>/, `<title>${title}${d.titleSuffix}</title>`);
  c = c.replace(/<meta[^>]*name="description"[^>]*\/?>/, `<meta name="description" content="${d.metaDesc(title)}"/>`);
  c = c.replace(/>MOQ 500 PCS[^<]*<\/div>/, `>${d.topbar}</div>`);
  for (const [enK, deV] of [["Home", d.nav.home], ["Products", d.nav.products], ["About Us", d.nav.about], ["Blog", d.nav.blog], ["News", d.nav.news], ["Contact Us", d.nav.contact]]) {
    c = c.replace(new RegExp(`>${enK}</a>`, "g"), `>${deV}</a>`);
  }
  c = c.replace(/>Request A Quote<\/a>/, `>${d.nav.quote}</a>`);
  c = c.replace(/<link[^>]*rel="canonical"[^>]*\/?>/, `<link href="${SITE}/${lang}/products/${prodFile}" rel="canonical"/>`);
  // spec table headers
  const specMap = [
    ["MOQ", d.specHeaders.moq], ["Business model", d.specHeaders.business], ["Customization", d.specHeaders.customization],
    ["Artwork", d.specHeaders.artwork], ["Lead time", d.specHeaders.leadtime], ["Material options", d.specHeaders.materials],
    ["Finish", d.specHeaders.finish], ["Packing", d.specHeaders.packing]
  ];
  for (const [enH, lH] of specMap) {
    c = c.replace(new RegExp(`<th>${enH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</th>`, "g"), `<th>${lH}</th>`);
  }
  const valMap = [
    ["500 PCS for custom packaging", d.specValues.moq], ["B2B RFQ only, no public retail price", d.specValues.business],
    ["Size, structure, material, color, logo, finish, barcode, QR code", d.specValues.customization],
    ["AI / PDF / PSD preferred with 3 mm bleed", d.specValues.artwork],
    ["Sampling and production time confirmed by specification", d.specValues.leadtime],
    ["Paperboard, kraft paper, PET, BOPP, PVC, tinplate or laminated film", d.specValues.materials],
    ["Matte, gloss, foil, embossing, varnish, lamination", d.specValues.finish],
    ["Flat packed or finished product packed in export carton", d.specValues.packing]
  ];
  for (const [enV, lV] of valMap) {
    c = c.replace(new RegExp(`<td>${enV.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</td>`, "g"), `<td>${lV}</td>`);
  }
  c = c.replace(/<h3>Request Factory Quote<\/h3>/, `<h3>${d.rfqBoxTitle}</h3>`);
  c = c.replace(/Send size, quantity, material, artwork and delivery country to Linda Wang\./, d.rfqBoxText);
  c = c.replace(/>WhatsApp Linda<\/a>/, `>${d.waCta}</a>`);
  c = c.replace(/>Email Inquiry<\/a>/, `>${d.emailCta}</a>`);
  c = c.replace(/<h2>AI Buyer Snapshot<\/h2>/, `<h2>${d.aiSnapshot}</h2>`);
  c = c.replace(/>Need Custom Packaging\?<\/div>/, `>${d.floatingHead}</div>`);
  // internal links
  c = c.replace(/href="(?!https?:|#|mailto:)(?:\.\.\/)?products\//g, `href="${lang}/products/`);
  c = c.replace(/href="\.\.\/index\.html"/g, `href="../../index.html"`);
  c = c.replace(/href="\.\.\/products\.html"/g, `href="../../products.html"`);
  c = c.replace(/href="\.\.\/contact\.html"/g, `href="../../contact.html"`);
  return c;
}

// --- Main ---
let total = 0;
for (const lang of LANGS) {
  const d = DICT[lang];
  const langDir = join(root, lang);
  const prodDir = join(langDir, "products");
  mkdirSync(prodDir, { recursive: true });
  const pages = [
    ["index.html", buildHome(lang, d)],
    ["products.html", buildProducts(lang, d)],
    ["contact.html", buildContact(lang, d)]
  ];
  for (const prod of PRODUCTS) {
    pages.push([join("products", prod), buildProduct(lang, d, prod)]);
  }
  for (const [rel, html] of pages) {
    if (html) {
      writeFileSync(join(langDir, rel), html, "utf8");
      total++;
    } else {
      console.log("MISSING SOURCE:", lang, rel);
    }
  }
  console.log(lang, "generated", pages.filter(([, h]) => h).length, "pages");
}
console.log("TOTAL", total);
