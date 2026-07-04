# V73 Factory B2B Hybrid Architecture

Updated: 2026-07-04

This package follows the recommended factory B2B independent-site architecture:

```txt
Static SEO/AI pages + ISR updates + dynamic buyer functions
```

## Page type structure

### Static / ISR pages for Google and AI search

- Homepage
- Product list page
- Product detail pages
- Blog list page
- Blog detail pages
- News list page
- News detail pages
- Static category hub pages
- Static industry solution pages
- sitemap.xml

### Dynamic functions for buyers

- Header search box
- Product page search filtering
- `/api/search?q=keyword`
- WhatsApp inquiry
- Email inquiry
- RFQ form
- R2/CMS HTML source
- `/api/revalidate`

## Added static/ISR category hubs

- /custom-packaging-boxes.html
- /custom-gift-boxes.html
- /custom-magnetic-gift-boxes.html
- /custom-stand-up-pouches.html
- /custom-coffee-bags-with-valve.html
- /custom-pharmaceutical-packaging-boxes.html
- /custom-cosmetic-packaging-boxes.html
- /custom-food-packaging.html
- /custom-paper-bags.html
- /custom-labels-and-stickers.html

## Added static/ISR industry solution pages

- /industry/cosmetic-packaging-solutions.html
- /industry/food-and-restaurant-packaging-solutions.html
- /industry/pharmaceutical-medical-packaging-solutions.html
- /industry/coffee-tea-packaging-solutions.html
- /industry/pet-food-packaging-solutions.html
- /industry/cannabis-packaging-solutions.html
- /industry/ecommerce-mailer-packaging-solutions.html
- /industry/luxury-gift-packaging-solutions.html

## Why this architecture

The site should not be pure dynamic, and it should not be old-style pure static only.

Best structure:

```txt
Next.js SSG + ISR + R2/CMS source + dynamic search/RFQ APIs
```

For Google and AI search, important pages are crawlable HTML with stable URLs, canonical tags, internal links, FAQ and structured data.

For buyers, dynamic functions support search, WhatsApp, email, RFQ and backend publishing.

## ISR publishing rules

### New product

Refresh only:

```txt
/products/{slug}.html
/products.html
/
/index.html
/sitemap.xml
/product-feed.json
/ai-index.json
```

### New blog

Refresh only:

```txt
/blog/{slug}.html
/blog.html
/
/index.html
/sitemap.xml
/ai-index.json
/llms.txt
```

### New news

Refresh only:

```txt
/news/{slug}.html
/news.html
/
/index.html
/sitemap.xml
/ai-index.json
/llms.txt
```

### New category hub

Refresh only:

```txt
/custom-{slug}.html
/products.html
/
/index.html
/sitemap.xml
/ai-index.json
```

### New industry solution page

Refresh only:

```txt
/industry/{slug}.html
/products.html
/
/index.html
/sitemap.xml
/ai-index.json
```

## Revalidate examples

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","type":"product","slug":"custom-magnetic-gift-boxes"}'
```

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","type":"industry","slug":"cosmetic-packaging-solutions"}'
```

## SEO/GEO protection

- Old URLs remain unchanged.
- Canonical tags remain stable.
- PublishedTime is not reset by builds.
- modifiedTime/lastmod should only change when content truly updates.
- New content is append-only.
- Search box helps buyers but is not the only SEO entry path.
- Category and industry pages give Googlebot crawlable internal links.

## Required Vercel variables

```txt
REVALIDATE_SECRET=your-long-random-secret
PFD_CONTENT_BASE_URL=https://your-r2-custom-domain.example.com/
PFD_ISR_SECONDS=3600
PFD_ENABLE_REMOTE_LISTS=true
```


---

# V72 SEO / GEO / Core Web Vitals / Precision ISR Setup

Updated: 2026-07-04

This package upgrades the V71 R2/CMS ISR site into a stronger B2B inquiry-focused independent site while preserving the approved visual layout.

## First principle preserved

- Homepage layout not redesigned.
- Product page layout not redesigned.
- Existing homepage/product images, image order, aspect ratios and positions are preserved.
- WhatsApp chat box and email inquiry box are not redesigned.

## Added content

20 new deep SEO/GEO pages were added:

### Blog
- /blog/custom-gift-boxes-rfq-cost-structure-finish-guide.html — Custom Gift Boxes RFQ Guide: Structure, Cost Drivers, Inserts and Premium Finishes
- /blog/magnetic-packaging-engineering-guide-for-premium-brands.html — Magnetic Packaging Engineering Guide for Premium Gift Sets and Retail Kits
- /blog/rigid-boxes-material-thickness-finish-selection-guide.html — Rigid Boxes Material, Thickness and Finish Selection Guide for B2B Packaging Buyers
- /blog/mailer-boxes-corrugated-board-ecommerce-shipping-guide.html — Mailer Boxes and Corrugated Board Guide for Ecommerce Shipping and Subscription Kits
- /blog/paper-bags-paper-gift-bag-handle-finish-guide.html — Paper Bags and Paper Gift Bag Guide: Materials, Handles, Finish and Retail RFQ Checklist
- /blog/sliding-drawer-box-premium-unboxing-structure-guide.html — Sliding Drawer Box Structure Guide for Premium Unboxing, Inserts and Retail Display
- /blog/cylinder-tube-packaging-paper-tube-rfq-guide.html — Cylinder Tube Packaging Guide for Candles, Tea, Coffee, Cosmetics and Gift Products
- /blog/foam-insert-eva-epe-molded-pulp-comparison-guide.html — Foam Insert, EVA, EPE and Molded Pulp Comparison Guide for Protective Gift Packaging
- /blog/food-packaging-box-safety-material-printing-guide.html — Food Packaging Box Guide: Food Safety, Grease Resistance, Paperboard and Printing
- /blog/cardstock-product-boxes-folding-carton-rfq-guide.html — Cardstock Product Boxes Guide: Folding Carton Materials, Finish and Retail RFQ Checklist
- /blog/b2b-packaging-dieline-artwork-prepress-checklist.html — B2B Packaging Dieline, Artwork and Prepress Checklist for Faster Sampling
- /blog/custom-packaging-cost-drivers-moq-500-buyer-guide.html — Custom Packaging Cost Drivers: MOQ 500 PCS, Materials, Tooling, Printing and Freight

### News
- /news/ai-search-b2b-packaging-procurement-2026.html — AI Search Changes B2B Packaging Procurement: What Buyers Expect from Supplier Pages
- /news/premium-gift-packaging-demand-custom-gift-boxes-rigid-boxes.html — Premium Gift Packaging Demand Moves Toward Custom Gift Boxes and Rigid Boxes
- /news/ecommerce-mailer-boxes-corrugated-protection-trend.html — Ecommerce Brands Increase Demand for Corrugated Mailer Boxes with Better Protection
- /news/paper-bags-paper-gift-bags-retail-branding-trend.html — Paper Bags and Paper Gift Bags Gain Value in Retail Branding and Gift Programs
- /news/food-packaging-box-buyers-focus-grease-resistance-food-grade.html — Food Packaging Box Buyers Focus on Grease Resistance, Food Contact and Custom Printing
- /news/r2-cms-isr-seo-packaging-publishing-trend.html — R2/CMS + ISR Becomes a Safer Publishing Model for Large Packaging Catalogs
- /news/magnetic-packaging-collapsible-rigid-box-export-trend.html — Collapsible Magnetic Gift Boxes Rise as Export Buyers Compare Freight and Luxury Feel
- /news/cardstock-product-boxes-retail-folding-carton-demand.html — Cardstock Product Boxes Demand Grows for Beauty, Electronics and Retail Goods

## Core Web Vitals improvements

- Hero images are preloaded in `app/layout.jsx`.
- Duplicate body-loaded `main.js` is stripped during App Router render to avoid double JS execution.
- Assets use immutable cache headers.
- Product detail main images use `loading="eager"` and `fetchpriority="high"`.
- Product listing first visible images are prioritized.
- WebP images were safely recompressed without changing dimensions or layout.
- Next.js compression and cache headers are configured.

## Precision ISR tags

The site now supports these revalidation tags:

```txt
products
product-slug
product-{slug}
blog
blog-slug
blog-{slug}
news
news-slug
news-{slug}
homepage
sitemap
```

## New product publish logic

When publishing a new product, only refresh:

```txt
/products/{slug}.html
/products.html
/
/index.html
/sitemap.xml
/product-feed.json
/ai-index.json
```

Example:

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","type":"product","slug":"custom-cardstock-product-boxes-foil-logo"}'
```

## New blog publish logic

When publishing a new blog, only refresh:

```txt
/blog/{slug}.html
/blog.html
/
/index.html
/sitemap.xml
/ai-index.json
/llms.txt
```

Example:

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","type":"blog","slug":"new-packaging-guide"}'
```

## New news publish logic

When publishing a new news page, only refresh:

```txt
/news/{slug}.html
/news.html
/
/index.html
/sitemap.xml
/ai-index.json
/llms.txt
```

Example:

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","type":"news","slug":"packaging-market-update"}'
```

## SEO protection rules

- Existing URLs remain unchanged.
- Canonical URLs remain stable.
- Published dates are stored in each article page and are not reset by ISR.
- Dynamic sitemap preserves existing local `lastmod` values.
- Remote R2/CMS manifests should include `lastmod`, `dateModified`, `datePublished` or `publishedTime` for accurate sitemap updates.
- New pages are append-only.

## Required Vercel environment variables

```txt
REVALIDATE_SECRET=your-long-random-secret
PFD_CONTENT_BASE_URL=https://your-r2-custom-domain.example.com/
PFD_ISR_SECONDS=3600
```

Optional:

```txt
PFD_REMOTE_CONTENT_FIRST=false
PFD_ENABLE_REMOTE_LISTS=true
PFD_PRODUCTS_INDEX_URL=https://your-r2-domain/data/products.remote.json
PFD_BLOG_INDEX_URL=https://your-r2-domain/data/blog.remote.json
PFD_NEWS_INDEX_URL=https://your-r2-domain/data/news.remote.json
```


---

# V71 R2 / CMS External HTML + ISR Setup

Updated: 2026-07-04

This package has been upgraded from file-only ISR to **R2/CMS external HTML source + ISR**.

## What this means

You can publish a new product, blog post or news article without rebuilding the whole website:

1. Upload the new HTML file to R2/CMS.
2. Update the matching remote manifest JSON.
3. Call `/api/revalidate` for only the changed path and list page.

The existing homepage and product page layouts remain untouched.

## Required Vercel environment variables

Set these in Vercel Project Settings:

```txt
REVALIDATE_SECRET=your-long-random-secret
PFD_CONTENT_BASE_URL=https://your-r2-custom-domain.example.com/
PFD_ISR_SECONDS=3600
```

Optional:

```txt
PFD_REMOTE_CONTENT_FIRST=true
PFD_ENABLE_REMOTE_LISTS=true
PFD_PRODUCTS_INDEX_URL=https://your-r2-custom-domain.example.com/data/products.remote.json
PFD_BLOG_INDEX_URL=https://your-r2-custom-domain.example.com/data/blog.remote.json
PFD_NEWS_INDEX_URL=https://your-r2-custom-domain.example.com/data/news.remote.json
```

## Recommended R2 folder structure

```txt
/
├── products/
│   └── new-product.html
├── blog/
│   └── new-post.html
├── news/
│   └── new-news.html
├── assets/
│   └── img/
│       └── products/
│           └── new-product.webp
└── data/
    ├── products.remote.json
    ├── blog.remote.json
    └── news.remote.json
```

## Remote products manifest format

`data/products.remote.json`

```json
{
  "items": [
    {
      "title": "Custom Cardstock Product Boxes with Foil Logo",
      "url": "products/custom-cardstock-product-boxes-foil-logo.html",
      "description": "Custom cardstock product boxes for beauty, electronics and retail brands. MOQ 500 PCS.",
      "image": "assets/img/products/custom-cardstock-product-boxes-foil-logo.webp",
      "category": "Cardstock Product Boxes",
      "keywords": "cardstock product boxes, custom product boxes, folding cartons"
    }
  ]
}
```

## Publish a new product without redeploy

Upload to R2:

```txt
products/custom-cardstock-product-boxes-foil-logo.html
assets/img/products/custom-cardstock-product-boxes-foil-logo.webp
data/products.remote.json
```

Then call ISR:

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","paths":["/products/custom-cardstock-product-boxes-foil-logo.html","/products.html","/sitemap.xml","/product-feed.json","/ai-index.json"]}'
```

## Publish a new blog post without redeploy

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","paths":["/blog/new-post.html","/blog.html","/sitemap.xml","/ai-index.json"]}'
```

## Publish a new news page without redeploy

```bash
curl -X POST "https://packagingfactorydirect.com/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_REVALIDATE_SECRET","paths":["/news/new-news.html","/news.html","/sitemap.xml","/ai-index.json"]}'
```

## How the code works

- `app/[[...path]]/page.jsx`
  - First serves local HTML if available.
  - If the local file is missing and the path is under `/products/`, `/blog/` or `/news/`, it fetches the same path from R2/CMS.
  - The remote HTML is cached by ISR.
  - Existing local pages keep their original URL equity.

- `products.html`, `blog.html`, `news.html`
  - Keep local cards.
  - Can inject remote cards from R2/CMS manifest JSON.

- `/sitemap.xml`, `/product-feed.json`, `/ai-index.json`
  - Have route handlers that can merge remote manifest data.

- `/api/revalidate`
  - Supports exact path-only ISR.

## SEO safety rules

- Do not delete or rename existing URLs.
- New pages should be append-only.
- Use self-canonical URLs.
- Use direct answer blocks, comparison tables, RFQ checklists and FAQ schema for GEO / AI search.
- Revalidate only the changed URL plus the affected listing/feed pages.


## Homepage lock
The homepage remains local and locked. R2/CMS updates do not automatically rewrite the homepage hero or approved layout.
