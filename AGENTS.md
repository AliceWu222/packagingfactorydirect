# Packaging Factory Direct change policy

These rules apply to every change in this repository.

## Protected existing content

- Do not modify or delete any existing product detail page, product URL, product image URL, product order, old blog article, or old news article.
- Do not modify the homepage layout, module order, homepage product images, floating chat tool, contact form, product detail layout, or desktop four-column product grids.
- Do not modify existing canonical URLs, `robots.txt`, sitemap route logic, DNS, or Google Search Console configuration unless the user gives a separate, explicit approval for that exact change.
- Do not create redirects that replace existing product, blog, or news URLs.
- New content must use a new stable URL and be append-only. Existing listing cards must keep their order; new cards may be appended.
- Never invent or infer prices, inventory, ratings, reviews, certifications, accreditations, customer names, order volumes, test results, delivery times, or company qualifications.

## Required workflow

1. Start from the latest `main` branch and create a `codex/` feature branch.
2. Before applying a website change, provide a per-file change list and a complete before/after diff.
3. Keep factual claims traceable to a public primary source or to user-provided evidence.
4. Structured data must match visible page content. Do not add `Offer`, `AggregateRating`, or `Review` without verifiable data.
5. Run the production build and protected-invariant checks before opening a pull request.
6. Do not merge or deploy without explicit user approval.

## New content defaults

- Use English for buyer-facing content.
- Lead with a direct answer, then provide specification tables, decision steps, limitations, sources, and buyer FAQs.
- Use an actual publication date and identify `Packaging Factory Direct` as the organizational content owner unless the user supplies a verified human author profile.
- Link naturally to stable existing category, product, trust, and RFQ pages without changing those pages.
