import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";

const NAV = `<div class="topbar"><div class="container">MOQ 500 PCS · OEM / ODM Custom Packaging Manufacturer</div></div>
<header class="header"><div class="container header-inner">
<a class="logo" href="index.html"><span class="logo-mark">▱</span><span>PACKAGING<br/><small>FACTORY DIRECT</small></span></a>
<nav class="nav"><a href="index.html">Home</a><a href="products.html">Products</a><a href="about.html">About Us</a><a href="blog.html">Blog</a><a href="news.html">News</a><a href="contact.html">Contact Us</a></nav>
<a class="btn" href="contact.html">Request A Quote</a>
</div></header>`;

const FOOTER = `<footer class="footer"><div class="container footer-grid">
<div><h4>Packaging Factory Direct</h4><p>Custom packaging manufacturer for boxes, pouches, paper bags, labels and printing. MOQ 500 PCS.</p></div>
<div><h4>Contact</h4><p>Linda Wang<br/>linda@colorprintingpackage.com<br/>+86 181 6573 0353<br/>Printing Industrial Park, Longhua District, Shenzhen, Guangdong Province, 518109, China</p></div>
<div><h4>MOQ</h4><p>All custom products start from 500 PCS. OEM &amp; Customize only. No retail price shown.</p></div>
</div></footer>
<script src="assets/js/main.js"></script>`;

function page(title, desc, h1, bodyHtml, breadcrumb, file) {
  return `<!DOCTYPE html>

<html lang="en"><head><meta charset="utf-8"/><meta content="width=device-width,initial-scale=1" name="viewport"/>
<title>${title}</title><meta content="${desc}" name="description"/>
<link href="https://www.packagingfactorydirect.com/${file}" rel="canonical"/><link href="assets/css/style.css" rel="stylesheet"/>
<meta content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" name="robots"/><meta content="Packaging Factory Direct" name="author"/><meta content="English" name="language"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://www.packagingfactorydirect.com/"},{"@type":"ListItem","position":2,"name":"${title}"}]}</script>
</head><body>
${NAV}
<section class="page-hero"><div class="container">
<nav aria-label="Breadcrumb"><ol style="list-style:none;display:flex;gap:8px;padding:0;margin:0 0 12px;font-size:13px;color:var(--muted)"><li><a href="index.html">Home</a></li><li aria-hidden="true">/</li><li aria-current="page">${breadcrumb}</li></ol></nav>
<h1>${h1}</h1>
</div></section>
<section class="section"><div class="container" style="max-width:860px">
${bodyHtml}
</div></section>
${FOOTER}
</body></html>`;
}

const hubs = [
  {
    file: "materials.html",
    title: "Packaging Materials Guide | Custom Boxes, Bags & Pouches Materials",
    desc: "Complete packaging materials guide: paperboard, kraft, corrugated, PET/PE films, aluminium foil, single-material recyclable structures. MOQ 500 PCS, factory direct.",
    h1: "Packaging Materials Guide: What to Specify for Boxes, Bags & Pouches",
    breadcrumb: "Materials",
    body: `<h2>1. Paperboard &amp; Cardboard Materials</h2>
<p><strong>White card (C1S/C2S)</strong> is the standard for cosmetic and pharmaceutical folding cartons — smooth print surface with good stiffness. <strong>Greyboard (chipboard)</strong> is the core of rigid/luxury boxes, wrapped with printed art paper. <strong>Kraft paper</strong> gives a natural, eco-friendly look for bags and mailer boxes. <strong>Corrugated</strong> adds strength for shipping boxes and e-commerce mailers. FSC<sup>®</sup>-certified paper is available under our license <strong>FSC<sup>®</sup> C144065</strong>.</p>
<h2>2. Flexible Film Materials</h2>
<p>For stand-up pouches, flat-bottom bags and spout pouches we work with <strong>PET/AL/PE high-barrier lamination</strong> (long shelf life, strong oxygen and moisture protection), <strong>single-material recyclable PE structures</strong> for sustainability programs, and <strong>matt or gloss BOPP</strong> for retail bags. Coffee bags typically add a degassing valve and zip or tin-tie closure.</p>
<h2>3. Food-Contact &amp; Compliance Materials</h2>
<p>Food packaging can be produced with FDA-compliant and EU 1935/2004 food-contact materials. Our PE-based stand-up pouch film carries migration test report <strong>XNQ Test Report XNO250418226BX2-1</strong> (available to qualified buyers on request). For pharma and medical-aesthetic packaging we support GS1 DataMatrix serialization and variable-data one-code-per-item printing.</p>
<h2>4. Choosing the Right Material for Your Product</h2>
<ul>
<li><strong>Cosmetics / jewellery:</strong> rigid box with greyboard core, art paper wrap, foil stamping, EVA inserts.</li>
<li><strong>Food / coffee / pet food:</strong> PET/AL/PE barrier pouch, valve + zip, matt finish.</li>
<li><strong>Retail / boutique:</strong> kraft paper bag, tissue paper, thank-you cards, sticker labels.</li>
<li><strong>Pharma / medical:</strong> white C2S carton, tamper-evident seal, variable data serialization.</li>
</ul>
<h2>5. Request Material Samples</h2>
<p>Tell Linda Wang your product, target market and shelf-life requirement. <a href="contact.html">Send your RFQ</a> or browse <a href="products.html">all custom packaging products</a>. MOQ starts at 500 PCS.</p>` },
  {
    file: "finishes.html",
    title: "Packaging Finishes Guide | Foil, UV, Soft-Touch, Embossing",
    desc: "Packaging print finishes explained: foil stamping, spot UV, soft-touch lamination, embossing, silk screen, laser effects. Factory direct, MOQ 500 PCS.",
    h1: "Packaging Finishes Guide: Foil, UV, Soft-Touch, Embossing & More",
    breadcrumb: "Finishes",
    body: `<h2>1. Foil Stamping (Hot Foil / Cold Foil)</h2>
<p>Gold, silver, rose-gold and holographic foil stamping adds a premium metallic accent to logos, borders and text on rigid boxes, cartons and paper bags. Ideal for luxury cosmetics, jewellery and gift packaging.</p>
<h2>2. Spot UV &amp; Gloss Varnish</h2>
<p>Spot UV creates a raised, glossy contrast on matte surfaces — a popular way to highlight logos and product names on folding cartons and mailers. Full gloss varnish gives an economical shine.</p>
<h2>3. Soft-Touch Matte Lamination</h2>
<p>Soft-touch (matte) lamination gives a velvet, premium feel and protects the print. Combined with spot UV or foil, it is the signature finish of high-end cosmetic and pharma packaging.</p>
<h2>4. Embossing / Debossing &amp; Silk Screen</h2>
<p>Embossing adds raised texture to logos and patterns; debossing recesses them. Silk-screen printing adds a thick, durable ink layer on rigid boxes, tins and bottles.</p>
<h2>5. Special Effects</h2>
<ul>
<li><strong>Laser-cut</strong> decorative windows and patterns.</li>
<li><strong>Holographic</strong> foil and anti-counterfeit security labels.</li>
<li><strong>Haptic / tactile</strong> textures on premium boxes.</li>
</ul>
<h2>6. Choose Your Finish</h2>
<p>Ask for free finish samples before mass production. <a href="contact.html">Request a quote</a> or view <a href="products.html">packaging products</a>. MOQ 500 PCS, samples in 3-7 days.</p>` },
  {
    file: "factory.html",
    title: "Our Factory | Shenzhen Packaging Manufacturer Equipment & QC",
    desc: "Shenzhen packaging factory: offset/rotogravure printing, box & pouch production lines, QC process, AQL inspection. Factory direct, MOQ 500 PCS.",
    h1: "Our Factory: Equipment, Capacity & Quality Control in Shenzhen",
    breadcrumb: "Factory",
    body: `<h2>1. Factory-Direct Manufacturing</h2>
<p>Packaging Factory Direct operates from Printing Industrial Park, Longhua District, Shenzhen, China. We own our printing and converting lines — you deal directly with the factory, not a trading company. That means factory pricing, direct technical support and faster sampling.</p>
<h2>2. Production Capabilities</h2>
<ul>
<li><strong>Printing:</strong> offset printing for paperboard cartons and paper bags; rotogravure and flexo for flexible film pouches; digital printing for short runs and variable data.</li>
<li><strong>Box &amp; carton:</strong> rigid box assembly, magnetic box, folding carton die-cutting and gluing lines.</li>
<li><strong>Pouch &amp; bag:</strong> stand-up pouch, flat-bottom bag, spout pouch and zip-bag converting lines.</li>
<li><strong>Finishing:</strong> foil stamping, lamination, embossing, spot UV, die-cutting, window patching.</li>
<li><strong>Labels &amp; security:</strong> label printing, holographic and anti-counterfeit labels, variable-data serialization (GS1 DataMatrix, batch/lot coding).</li>
</ul>
<h2>3. Quality Control &amp; Inspection</h2>
<p>QC checks run at every stage: incoming material inspection, print colour check against approved proof, in-process sampling, and final AQL inspection before shipment. Pre-shipment photos and inspection reports are available on request.</p>
<h2>4. Compliance Documents</h2>
<p>We can provide: FSC<sup>®</sup> chain-of-custody confirmation (<strong>C144065</strong>), FDA food-contact migration test report (<strong>XNO250418226BX2-1</strong>), REACH substance declaration, EU 1935/2004 declaration, material data sheets and AQL inspection reports.</p>
<h2>5. Visit or Audit</h2>
<p>We welcome buyer audits (on-site or video) before mass production. <a href="contact.html">Contact Linda Wang</a> to arrange a factory tour or <a href="samples.html">request samples</a>.</p>` },
  {
    file: "samples.html",
    title: "Free Packaging Samples & Sample Book | Packaging Factory Direct",
    desc: "Request free packaging samples and dielines: boxes, pouches, paper bags, labels. Sample lead time 3-7 days, free dieline within 24h. MOQ 500 PCS.",
    h1: "Packaging Samples & Free Dieline Service",
    breadcrumb: "Samples",
    body: `<h2>1. Free Dieline / Structural Drawing</h2>
<p>Send us your product dimensions (or a sample) and we will prepare a free dieline / structural drawing within 24 hours, so you can check the construction before any commitment.</p>
<h2>2. Physical Samples</h2>
<ul>
<li><strong>Sample lead time:</strong> 3-7 days after artwork approval (standard).</li>
<li><strong>Material &amp; finish verification:</strong> confirm paper/card grade, film structure, foil, lamination and embossing.</li>
<li><strong>Print colour proof:</strong> colour-accurate proof before mass production.</li>
</ul>
<h2>3. Sample Policy</h2>
<p>Samples are produced from your approved dieline. Standard sample fee applies for complex structures (magnetic boxes, barrier pouches); the fee is credited toward your first production order. MOQ for production: 500 PCS.</p>
<h2>4. How to Request Samples</h2>
<p>Email <a class="email-link" href="mailto:linda@colorprintingpackage.com?subject=Sample%20Request">linda@colorprintingpackage.com</a> or WhatsApp <a class="email-link" href="https://wa.me/8618165730353?text=Hello%20Linda%2C%20I%20want%20to%20request%20packaging%20samples." target="_blank" rel="noopener">+86 181 6573 0353</a> with: product type, dimensions, quantity, material preference, artwork or logo, and delivery country.</p>
<h2>5. Related Guides</h2>
<p>See our <a href="materials.html">materials guide</a>, <a href="finishes.html">finishes guide</a> and <a href="products.html">full product range</a>.</p>` }
];

mkdirSync(join(root, "scripts", "multilang", "out"), { recursive: true });
for (const h of hubs) {
  const html = page(h.title, h.desc, h.h1, h.body, h.breadcrumb, h.file);
  writeFileSync(join(root, h.file), html, "utf8");
  console.log("written", h.file, html.length, "chars");
}
