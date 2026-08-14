# Packaging blog benchmark and two-guide change plan

Date: 2026-08-14

Branch: `codex/add-2-packaging-guides-20260814`

Scope: append-only content addition; no merge or production deployment is authorized by this document.

## Protected baseline

- 182 existing product HTML files remain byte-for-byte protected.
- 43 existing blog HTML files remain byte-for-byte protected.
- 18 existing news HTML files remain byte-for-byte protected.
- No homepage, product listing, product detail, news listing, CSS, JavaScript, image, chat, form, canonical, robots, sitemap route, DNS or GSC file is in the change scope.
- Existing URLs, card order and the desktop four-column rule remain unchanged.

## Six independent-site editorial benchmarks

The review looked for useful editorial patterns, not text to reproduce.

| Site | Pages reviewed | Editorial pattern worth learning | Safeguard applied here |
|---|---|---|---|
| Paper Mart | [Blog](https://blog.papermart.com/) and [How to Measure a Box or Bag](https://blog.papermart.com/how-to/measure-a-box-or-bag/) | Starts with a practical question, explains L x W x H, uses short sections and takeaways | No sentences, examples or diagrams are copied; the new guide is written for controlled B2B custom-box RFQs |
| PackMojo | [Blog](https://packmojo.com/blog/) and [Paperboard vs Corrugated](https://packmojo.com/blog/paperboard-vs-corrugated-materials/) | Comparison-first content, decision tables and buyer use cases | Claims are limited to verifiable standards and project-specific validation |
| Packhelp | [Blog](https://packhelp.com/blog/) and [Case studies](https://packhelp.com/case-study/) | Problem-solution-result structure, navigation and contextual internal links | No unverified customer result or case study is invented |
| Arka | [Insights](https://www.arka.com/blogs/news) and [Types of Mailer Boxes](https://www.arka.com/blogs/news/types-of-mailer-boxes) | Search-question headings, use-case categories, tables and FAQs | Uncited percentages and broad performance claims are excluded |
| Refine Packaging | [Blog](https://refinepackaging.com/blog/), [How to Test Custom Packaging](https://refinepackaging.com/blog/how-to-test-custom-packaging/) and [How to Request and Use Packaging Samples](https://refinepackaging.com/blog/how-to-request-and-use-packaging-samples-effectively/) | Quick answers, QC checklists, limitations and source links | Primary standards and carrier sources are cited directly |
| Packlane | [How to Create Custom Packaging](https://packlane.com/blog/how-to-create-custom-packaging/) and [Complete Guide to Custom Boxes](https://packlane.com/blog/what-are-custom-boxes-the-complete-guide-packlane/) | Beginner-to-decision progression, examples, authorship and FAQs | The new pages identify an organizational content owner and review date without inventing a person or credential |

## Existing-content overlap audit

The repository already covers MOQ, landed cost, dimensional shipping weight, materials, inserts, magnetic closures, dielines, artwork, sampling, transit testing, color control, food-contact documentation and quote comparison. The two proposed pages fill narrower gaps:

1. `how-to-measure-product-for-custom-box.html` focuses on how to measure the physical product, its maximum extents, orientation, insert interfaces, internal versus external box dimensions and production-intent fit validation. It does not replace the existing RFQ, sample, landed-cost or transit-test guides.
2. `gsm-vs-pt-mm-packaging-paperboard-guide.html` focuses on measurement systems: grammage versus caliper, exact point-to-millimeter unit conversion, why GSM cannot be converted universally to thickness, and what evidence to put in a paperboard RFQ. It does not replace the existing material-selection or rigid-box guides.

No keyword-volume or keyword-difficulty number is claimed because this workspace has no connected Semrush or Google Search Console dataset. The topics are selected from repeated current search intent and business relevance, not invented search-volume figures.

## Keyword and intent map

| New URL | Primary query family | Supporting query families | Buyer intent | Existing pages linked contextually |
|---|---|---|---|---|
| `/blog/how-to-measure-product-for-custom-box.html` | how to measure a product for a custom box | custom box dimensions; internal vs external box dimensions; product dimensions for packaging; box insert clearance | Specification / RFQ preparation | Custom Packaging Boxes; Custom Gift Boxes; RFQ Template; Sample Process; Transit Test Guide |
| `/blog/gsm-vs-pt-mm-packaging-paperboard-guide.html` | GSM vs PT vs mm packaging paperboard | paperboard thickness units; point to mm paper thickness; paper GSM vs thickness; folding carton board specification | Material comparison / RFQ preparation | Custom Paper Box Material Guide; Rigid Box Material Guide; Cardstock Product Boxes; Sample Process |

## Primary evidence planned for the new guides

- ISO 536:2019, paper and board determination of grammage: <https://www.iso.org/standard/77583.html>
- ISO 534:2011, paper and board thickness, density and specific volume: <https://www.iso.org/standard/53060.html>
- TAPPI/ANSI T 410, grammage: <https://imisrise.tappi.org/TAPPI/Products/01/T/0104T410.aspx>
- TAPPI/ANSI T 411, caliper: <https://imisrise.tappi.org/TAPPI/Products/01/T/0104T411.aspx>
- TAPPI Writing Guide, definition of a point as 0.001 inch: <https://www.tappi.org/content/Writing%20Guide.pdf>
- UPS package dimensions and dimensional weight: <https://developer.ups.com/us/en/support/shipping-support/shipping-dimensions-weight>
- FedEx dimensional-weight calculator: <https://page.message.fedex.com/weight_calculator>
- ISTA packaged-product design guidance: <https://ista.org/getting_started_with_design.php>
- ISTA retesting guidance: <https://support.ista.org/portal/en/kb/articles/when-should-a-packaged-product-be-retested>

## Complete planned per-file before/after difference

### 1. NEW `blog/how-to-measure-product-for-custom-box.html`

Before: file does not exist.

After: one new, indexable English guide at a new canonical URL. It contains the following complete content blocks, in this order:

1. Unique title, description, canonical, Open Graph and publication metadata.
2. Body-side JSON-LD graph with `Article`/`BlogPosting` and five FAQ entities whose answers match visible text.
3. Existing site top bar, header, navigation and Request a Quote entry copied as a template, without changing shared files.
4. Direct answer explaining maximum product extents, planned orientation, insert/cushioning allowance, internal versus external dimensions, closed-sample measurement and validation.
5. Key-takeaway list.
6. Dimension-language comparison table.
7. Eight-step measurement workflow.
8. Structure-specific table for folding cartons, rigid boxes, corrugated mailers, tray-and-sleeve boxes and multi-item kits.
9. Controlled RFQ measurement table and common-error section.
10. Primary sources, limitations and five visible FAQs.
11. Existing-style RFQ block, unchanged-style floating WhatsApp/email chat and footer.

The guide will not state one universal clearance, carrier divisor, lead time, price, certification or performance result.

### 2. NEW `blog/gsm-vs-pt-mm-packaging-paperboard-guide.html`

Before: file does not exist.

After: one new, indexable English guide at a new canonical URL. It contains the following complete content blocks, in this order:

1. Unique title, description, canonical, Open Graph and publication metadata.
2. Body-side JSON-LD graph with `Article`/`BlogPosting` and five FAQ entities whose answers match visible text.
3. Existing site top bar, header, navigation and Request a Quote entry copied as a template, without changing shared files.
4. Direct answer: GSM measures mass per area; PT and mm measure thickness; no universal GSM-to-thickness conversion exists.
5. Key-takeaway list and unit comparison table.
6. Exact point-to-millimeter table labelled as a unit conversion, not a board-performance guarantee.
7. Explanation of why composition, coating, moisture, compression and bulk can change caliper at similar grammage.
8. Separate buying specifications for folding cartons, wrapped rigid boxes and corrugated mailers.
9. Sample approval, incoming-QC and RFQ checklists.
10. Primary sources, limitations and five visible FAQs.
11. Existing-style RFQ block, unchanged-style floating WhatsApp/email chat and footer.

The guide will not declare a universal best GSM or infer box strength, compliance or food suitability from GSM alone.

### 3. MODIFIED `blog.html`

Before, at the final marked append-only block:

```html
<article class="card">...custom-packaging-rfq-template-quote-comparison-guide.html...</article><!-- END 2026-08-10 FORUM PAIN-POINT GUIDES -->
```

After:

```html
<article class="card">...custom-packaging-rfq-template-quote-comparison-guide.html...</article>
<article class="card"><div class="card-body"><span class="tag">Box Measurement</span><h3><a href="blog/how-to-measure-product-for-custom-box.html">How to Measure a Product for a Custom Box</a></h3><p>Build a reliable box RFQ with controlled product dimensions, orientation, insert clearance and internal-versus-external measurements.</p></div></article>
<article class="card"><div class="card-body"><span class="tag">Paperboard Units</span><h3><a href="blog/gsm-vs-pt-mm-packaging-paperboard-guide.html">GSM vs PT vs mm: Packaging Paperboard Guide</a></h3><p>Compare grammage and thickness units, avoid false GSM conversions and specify folding carton, rigid and corrugated board clearly.</p></div></article><!-- END 2026-08-10 FORUM PAIN-POINT GUIDES -->
```

No existing card is edited, moved or removed. Both cards are appended at the end of the current grid, so the shared four-column CSS remains untouched.

### 4. MODIFIED `scripts/verify-protected-invariants.mjs`

Before:

```js
const APPENDED_BLOGS = [
  // five existing paths
  'blog/custom-packaging-rfq-template-quote-comparison-guide.html'
];
if (blogFiles.length !== 43) violations.push(...);
```

After:

```js
const APPENDED_BLOGS = [
  // the same five existing paths, unchanged and in the same order
  'blog/custom-packaging-rfq-template-quote-comparison-guide.html',
  'blog/how-to-measure-product-for-custom-box.html',
  'blog/gsm-vs-pt-mm-packaging-paperboard-guide.html'
];
if (blogFiles.length !== 45) violations.push(...);
```

This expands only the new-content allowlist and expected blog inventory. All protections for old pages, product count, news count, four-column CSS and append order remain active.

### 5. NEW `deliveries/packaging-blog-benchmark-and-2-guides-20260814.md`

Before: file does not exist.

After: this internal research, scope, planned-difference and rollback document. It is not a public site route.

## Rollback plan

1. The work is isolated on `codex/add-2-packaging-guides-20260814`; `main` is not changed.
2. Before any future merge, the branch can be abandoned with no production effect.
3. If the two-page commit is later merged and a rollback is approved, revert that single commit. The revert removes only the two new HTML files, the two appended cards, the allowlist/count update and this internal report.
4. No old URL needs a redirect because no old URL is touched. If the new URLs have already been indexed before a rollback, removal strategy must be decided separately rather than silently returning an accidental status.

## Required verification before a draft PR

- `git diff --check` passes.
- Every JSON-LD block parses and visible FAQ answers match schema answers.
- Both new titles and descriptions are unique; both canonicals use the `www` HTTPS origin.
- Every internal link resolves to a repository route.
- Production build passes.
- Protected-invariant script reports 182 products, 45 blogs, 18 news files, zero protected-file changes, append-only listing and a desktop four-column rule.
- The branch may be pushed and a draft PR may be opened; merging and production deployment require a separate explicit approval.

## Completed verification record

- Final changed-file scope: exactly the five files documented above.
- New visible article length: 1,844 words for the measurement guide and 1,845 words for the GSM/PT/mm guide.
- Metadata: title lengths are 41 and 43 characters; description lengths are 149 and 147 characters.
- Structured data: both JSON-LD graphs parse; each page has an organizational Article/BlogPosting owner and five FAQ answers that exactly match visible page answers.
- Links: all local `href` and `src` targets in the two new pages exist.
- Render: both production-rendered article routes return HTTP 200 and retain FAQ markup and the existing-style floating chat entry.
- Discovery: `sitemap-blog.xml` automatically contains both new canonical URLs.
- Inventory/protection: 182 product HTML files, 45 blog HTML files and 18 news HTML files; zero protected old files changed; listing remains append-only; desktop four-column CSS rule remains present.
- Build: Next.js production compilation and static generation completed successfully for 288 routes.

### Existing AI Feed limitation deliberately excluded from this change

The production check found that `/ai-index.json` is currently shadowed by the pre-existing static `public/ai-index.json` snapshot dated 2026-08-08. That snapshot reports 180 products, 19 blog guides and 13 news briefs, so it does not expose the current 182/45/18 local inventory or these two new slugs. The dynamic route already has local-inventory logic, but the static public file wins at runtime.

Correcting that old whole-site feed would require a separately documented change to existing AI-discovery infrastructure and a complete inventory-diff review. It is intentionally not bundled into this two-article append-only change. The new pages remain discoverable through `blog.html`, `sitemap-blog.xml`, contextual links and page-level Article/FAQ structured data.
