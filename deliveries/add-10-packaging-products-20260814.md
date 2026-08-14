# Add 10 Packaging Products — Delivery and Rollback Record

Date: 2026-08-14

## Scope boundary

- Baseline commit before this work: `6336da9c559c0de04459babcb6f94ec38f168b41`
- Working branch: `codex/add-10-packaging-products-20260814`
- Change model: append-only
- Existing product HTML pages, product images, product-card order, homepage, homepage images, layout CSS, chat widget, blog/news pages, canonical URLs, robots rules and sitemap routes are out of scope and must remain unchanged.
- The new photographs are packaging visualizations. Product props are not included in the packaging quotation.
- No price, stock, rating, review, certification, customer name, order volume or guaranteed delivery claim is added.

## Image-edit mapping

All images were edited in image-to-image mode. The common direction was a square, high-resolution, warm-ivory Instagram-style product studio; the packaging structure remained identifiable; third-party branding and legible identifying copy were removed or replaced with the exact placeholder `Custom Logo`.

| Source image | Generated master | Website WebP |
|---|---|---|
| `codex-clipboard-f601226c-cd11-4fb8-bddf-1faf4e9b188d.png` | `exec-90daad45-df7a-4d7a-92f2-e775db6fe26d.png` | `assets/img/products/custom-perfume-gift-box-insert-fragrance-sets-1.webp` |
| `codex-clipboard-23460098-0a0c-47a5-a6f8-6882e2f1c086.png` | `exec-300e318b-cb42-4840-b746-bfd1b16e1f8b.png` | `assets/img/products/custom-six-candle-gift-box-aromatherapy-discovery-sets-1.webp` |
| `codex-clipboard-ff1a73fa-bd52-4461-94bb-af26c7ea49cd.png` | `exec-e07b599a-e6be-480a-b71b-7392eb98f763.png` | `assets/img/products/custom-candle-reed-diffuser-gift-box-satin-insert-1.webp` |
| `codex-clipboard-fe919edb-043a-43fa-b2f3-a7a350da3833.png` | `exec-b873d4cf-ef06-44f0-9821-525b0ed4da69.png` | `assets/img/products/custom-candle-care-set-gift-box-fitted-tool-insert-1.webp` |
| `codex-clipboard-b8df374e-6995-4663-98ba-89f8c2bad486.png` | `exec-29d79b13-8405-42e5-82b9-f957b7f808a8.png` | `assets/img/products/custom-candle-diffuser-gift-box-paperboard-insert-1.webp` |
| `codex-clipboard-d6981f06-888b-4975-ba01-0fbd25231185.png` | `exec-01f548ae-c853-429c-a89d-33d06fac248e.png` | `assets/img/products/custom-home-fragrance-gift-box-room-spray-candle-1.webp` |
| `codex-clipboard-6cdcb337-8c8a-4504-a30c-5c8ca750198e.png` | `exec-fff0244b-509a-41a1-89ca-7f3962171476.png` | `assets/img/products/custom-pink-corrugated-mailer-box-beauty-subscriptions-1.webp` |
| `codex-clipboard-f46c1215-8a5b-4648-b538-a97b4e21d208.png` | `exec-9b5453ba-d2f9-4709-b962-7b65a198aa00.png` | `assets/img/products/custom-beauty-product-mailer-box-matching-paper-bag-1.webp` |
| `codex-clipboard-1d82f91d-6d3c-4c3c-899a-bfac1c4ab43d.png` | `exec-4fa26d4c-ef9c-49ec-b8d7-1b15e025b57a.png` | `assets/img/products/custom-ribbon-closure-rigid-gift-box-jewelry-1.webp` |
| `codex-clipboard-315c039c-da6f-4528-9ef2-f3de6b4f35d6.png` | `exec-bde0913d-6f91-4650-9c29-78282bc00426.png` | `assets/img/products/custom-floral-embossed-hang-tags-bridal-boutiques-1.webp` |

Generated masters remain in `E:/codex/codex-home/generated_images/019f9798-35f6-7821-b84f-74295003629f/`. Website assets are 1200 × 1200 WebP files created at quality 84 with metadata omitted. No original source or existing website image was overwritten.

## Intent-led keyword map

The terms below are based on current English-language buyer terminology visible in search results and on B2B relevance. No monthly search volume, keyword difficulty or ranking position is claimed because no verified keyword-volume account was connected during this change.

| New URL | Primary commercial-intent query | Differentiating supporting intent |
|---|---|---|
| `/products/custom-perfume-gift-box-insert-fragrance-sets.html` | custom perfume gift box with insert | fragrance set packaging; perfume box with atomizer insert |
| `/products/custom-six-candle-gift-box-aromatherapy-discovery-sets.html` | custom candle gift box | six-candle discovery set packaging; multi-cavity candle insert |
| `/products/custom-candle-reed-diffuser-gift-box-satin-insert.html` | candle and reed diffuser gift box | home fragrance gift box; satin-style insert packaging |
| `/products/custom-candle-care-set-gift-box-fitted-tool-insert.html` | candle care set gift box | wick trimmer packaging; candle tool insert box |
| `/products/custom-candle-diffuser-gift-box-paperboard-insert.html` | candle diffuser gift box packaging | paperboard insert gift box; diffuser stick compartment |
| `/products/custom-home-fragrance-gift-box-room-spray-candle.html` | home fragrance gift box packaging | room spray and candle box; fitted trigger-spray insert |
| `/products/custom-pink-corrugated-mailer-box-beauty-subscriptions.html` | custom beauty subscription mailer box | pink corrugated mailer; skincare ecommerce box |
| `/products/custom-beauty-product-mailer-box-matching-paper-bag.html` | custom beauty product mailer box | coordinated paper bag and tissue; cosmetic retail packaging set |
| `/products/custom-ribbon-closure-rigid-gift-box-jewelry.html` | custom ribbon closure rigid gift box | jewelry gift box; bridal gift packaging |
| `/products/custom-floral-embossed-hang-tags-bridal-boutiques.html` | custom embossed hang tags | floral bridal boutique tag; apparel hang tag with string |

## Before and after

### Added

- 10 product HTML pages under `products/`.
- 10 product WebP files under `assets/img/products/`.
- Each page has a self-referencing `https://www.packagingfactorydirect.com/...` canonical, one visible H1, direct-answer text, a buyer specification table, fit limitations, RFQ inputs, visible FAQs, FAQ JSON-LD and breadcrumb JSON-LD.
- Static product pages contain no `Offer`, `AggregateRating` or `Review` structured data. The application runtime continues to provide the existing Product + RFQ Service graph without public price or inventory claims.

### Modified

- `products.html`: one marked block of 10 cards appended after all existing product cards and before the existing buyer-solution section. Existing bytes outside this block must equal the baseline file.
- `app/[[...path]]/page.jsx`: product-list meta description count changed from 182 to 192, and an exact ten-URL allowlist injects the visible FAQ pairs as FAQ JSON-LD for the new pages only. Existing product-page schema behavior is unchanged.
- `public/product-feed.json` and `data/products.manifest.json`: the existing 180 feed items remain unchanged and in the same order; two previously published product URLs that were absent from the static feed are appended first, followed by the ten new product URLs, bringing both feeds to 192 items.
- `scripts/verify-protected-invariants.mjs`: exact new URL allowlist, append-only byte verification, schema-safety checks, image existence checks and expected product count changed from 182 to 192.

### Not modified

- Homepage and homepage images
- Existing product HTML pages and images
- Existing blog and news pages
- Desktop four-column CSS
- Chat widget markup and scripts
- Existing canonical URLs
- Robots and sitemap routing
- DNS and Google Search Console configuration

## Rollback

### Before merge

No production rollback is needed. Do not merge the pull request; the live `main` branch remains at the baseline or a later independently approved commit.

### After merge

Use a revert commit rather than rewriting history:

1. Identify the merge commit for this pull request.
2. Create a rollback branch from current `main`.
3. Run `git revert -m 1 <merge-commit-sha>`.
4. Open and merge the revert pull request after build and invariant checks.

This removes the ten new cards, pages and images and restores the 182-product description/count without changing older product, blog or news history.

## Verification completed

- Protected-invariant check: passed; 192 product HTML files, 43 blog files and 18 news files.
- Append-only product listing check: passed; existing listing content is unchanged outside the marked block.
- Desktop browser check at 1440 px: passed; the last four new cards occupy four equal columns in one row.
- New product route checks: all ten return HTTP 200 in the production build.
- Image checks: all ten website images are WebP, 1200 × 1200, and approximately 64–155 KB.
- Structured-data check: final rendered pages contain Organization, WebSite, BreadcrumbList, WebPage, Product, Service and FAQPage nodes. The Product node has no public price, inventory, rating or review data.
- Product Sitemap and image Sitemap checks: all ten new product URLs and all ten new image URLs are present.
- Static product Feed and manifest: 192 items; original 180 items remain in the same order, followed by the two previously omitted existing URLs and the ten new URLs.
- Production build: passed, 296 static/dynamic routes generated. The pre-existing multi-lockfile/NFT trace warning remains and is unrelated to these append-only product changes.
