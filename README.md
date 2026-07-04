# Packaging Factory Direct Static Website Package

Domain: packagingfactorydirect.com
Contact: Linda Wang
Email: linda@colorprintingpackage.com
WhatsApp: +86 181 6573 0353
Address: Printing Industrial Park, Longhua District, Shenzhen, Guangdong Province, 518109, China

Deploy:
1. Upload all files to a GitHub repository root.
2. Enable GitHub Pages or import the repository into Vercel.
3. Set the domain packagingfactorydirect.com in DNS.
4. Test WhatsApp and email links after deployment.

Note: direct GitHub/Accio/Vercel account connection requires your account authorization; this package is ready for deployment.


## V69 SEO/GEO/ISR Update

- Added AI-friendly blog/news pages targeting Custom Gift Boxes, Magnetic Packaging, Rigid Boxes, Mailer Boxes, Paper Bags and long-tail B2B packaging terms.
- Enabled path-only ISR docs and enhanced `/api/revalidate` endpoint for products/blog/news.
- Updated `llms.txt`, `ai-index.json`, `data/seo-geo-keyword-map.json` and `data/ai-search-answer-cards.json`.
- Regenerated sitemap and compressed WebP images without changing layout dimensions.


## V71 R2/CMS External HTML ISR Upgrade

This package supports external product/blog/news HTML from R2 or a CMS.

Key files:
- `app/[[...path]]/page.jsx`
- `app/api/revalidate/route.js`
- `app/api/isr-status/route.js`
- `app/sitemap.xml/route.js`
- `app/product-feed.json/route.js`
- `app/ai-index.json/route.js`
- `data/r2-cms-content-source.example.json`
- `R2_CMS_ISR_SETUP.md`

Set `PFD_CONTENT_BASE_URL` and `REVALIDATE_SECRET` in Vercel. New products can be uploaded to R2 and served by ISR without a Git redeploy.


## V72 SEO/GEO/CWV/Precision ISR Upgrade

- Added 20 deep SEO/GEO blog/news pages.
- Improved Core Web Vitals by preloading hero images, removing duplicate App Router JS execution, prioritizing LCP product images and preserving image dimensions.
- Added precise ISR tag logic for products, product-slug, blog, blog-slug, news, news-slug, homepage and sitemap.
- Preserved homepage and product visual layout.


## V73 Factory B2B Hybrid Architecture

- Added static/ISR category hub pages.
- Added static/ISR industry solution pages.
- Added dynamic `/api/search` for buyer search.
- Improved product search keyword coverage without changing product images/layout.
- Updated ISR revalidation rules for category and industry pages.
