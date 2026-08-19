import { readFileSync, writeFileSync } from "fs";
const root = "C:/Users/Administrator/AccioWork/2026-07-18-05-34-49/packagingfactorydirect_site";
const f = root + "/contact.html";
let c = readFileSync(f, "utf8");
const old = '<form class="rfq-form" id="rfqForm"><select name="Product Type">';
const newOpen = '<form class="rfq-form" id="rfqForm" action="https://formsubmit.co/linda@colorprintingpackage.com" method="POST" enctype="multipart/form-data"><input type="hidden" name="_subject" value="New RFQ from packagingfactorydirect.com"/><input type="hidden" name="_template" value="table"/><input type="hidden" name="_captcha" value="false"/><input type="hidden" name="_next" value="https://www.packagingfactorydirect.com/thank-you.html"/><input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off"/><select name="Product Type">';
if (c.includes(old)) {
  c = c.replace(old, newOpen);
  // Add a real submit button before the WhatsApp link (keep existing buttons untouched)
  const waAnchor = '<a class="btn" id="rfqWhatsApp"';
  if (c.includes(waAnchor)) {
    const submitBtn = '<button class="btn" type="submit" style="margin-right:6px">Submit RFQ</button>';
    c = c.replace(waAnchor, submitBtn + waAnchor);
  }
  writeFileSync(f, c, "utf8");
  console.log("contact form updated");
} else {
  console.log("PATTERN NOT FOUND");
}
