# AI Index Sync and Critical Bug Audit — 2026-08-14

## Scope and protected invariants

This change is limited to the machine-readable AI index and its regression checks.

The following are explicitly out of scope and must remain byte-for-byte or behaviorally unchanged:

- homepage markup, layout, module order and homepage images;
- product images, product detail layout and the desktop four-column product grid;
- floating chat/RFQ tools and forms;
- every existing product, blog and news URL and page body;
- canonical URLs, `robots.txt`, all sitemap files/routes and DNS/GSC settings;
- existing product order in `products.html`, `public/product-feed.json` and `data/products.manifest.json`.

## Pre-change findings

### Confirmed live state

- PR #12 is merged into `main`; production deployment succeeded; its source branch is retained.
- `/ai-index.json` currently returns HTTP 200 and dynamically exposes 192 products, 45 blog guides and 18 news pages.
- The live AI index still reports `generatedAt: 2026-07-04` because that value leaks from an old static seed.
- Repository static snapshots are stale:
  - `public/ai-index.json`: 180 products, 19 blog guides, 13 news pages.
  - `ai-index.json`: 181 products, 19 blog guides, 13 news pages.
- `/product-feed.json` contains 192 products.
- Product/blog/news/image sitemaps return HTTP 200 and contain 192/45/18/196 page entries respectively.
- All 288 unique URLs from the page, product, blog and news sitemaps returned HTTP 200 in the production crawl.
- Sampled homepage, listing, old/new product, old/new blog and news pages use the existing `https://www.packagingfactorydirect.com/...` canonical URLs.
- Sampled live JSON-LD parses as valid JSON and does not contain price, `AggregateRating`, `Review` or inventory `Offer` claims.
- No user-visible mojibake was found in the sampled live pages.
- A GSC data audit cannot be run in this environment because Google Cloud CLI/GSC authorization is not connected; this does not block the code-level feed repair.

## Per-file change list and before/after difference

### 1. `scripts/sync-ai-index.mjs` — new

Before: there is no deterministic task that synchronizes static AI snapshots with the local product/blog/news HTML inventory.

After: an append-preserving synchronization task will:

- retain existing item objects and URL order;
- append newly discovered stable URLs only;
- produce 192 product, 45 blog and 18 news records;
- refresh product/blog/news page classifications;
- add explicit `contentCounts` and a current `generatedAt` date;
- write the current inventory to the private root snapshot used as the dynamic route's sanitized build seed.

### 2. `ai-index.json`

Before: 181 products, 19 blog guides, 13 news pages; `generatedAt: 2026-07-04`.

After: 192 products, 45 blog guides, 18 news pages; current generation date; matching classification counts. Existing URLs are retained and only missing URLs are appended.

### 3. `public/ai-index.json` — remove obsolete route-shadowing copy

Before: the static public file can take precedence over `app/ai-index.json/route.js` in a production build. This bypasses runtime sanitization, can expose internal seed fields and can reintroduce stale counts after deployment.

After: remove only the duplicate static shadow. The public URL `/ai-index.json` remains unchanged and is served by the existing App Router endpoint. The synchronized root `ai-index.json` remains the private build seed and rollback copy.

### 4. `app/ai-index.json/route.js`

Before: live inventory arrays are current, but `generatedAt` is inherited from the old static seed and there is no explicit count object.

After: the route will read only the synchronized root seed, expose build-time `generatedAt`, preserve the static snapshot date separately as `snapshotGeneratedAt`, publish explicit `contentCounts` derived from the same live arrays, and continue stripping internal configuration fields. URL and response path remain `/ai-index.json`.

### 5. `package.json`

Before: no command exists for AI snapshot synchronization.

After: add `npm run sync:ai-index`; no dependency or build-command changes.

### 6. `scripts/verify-protected-invariants.mjs`

Before: protected-page checks cover page counts, append-only product/blog lists, product feed order and the four-column rule, but do not fail on a stale AI snapshot.

After: add assertions for 192/45/18 in the synchronized root snapshot, its page classifications, explicit counts, absence of the obsolete public shadow, and the live route's generated-time/count/sanitization logic. Existing protected checks remain intact.

### 7. `public/llms.txt` and `data/llms-source.txt`

Before: the buyer-facing LLM summary is stored at the same public path as the dynamic `/llms.txt` route. A production build can therefore bypass the route's canonical-host normalization and AI guidance addendum.

After: move the unchanged buyer-facing source text to `data/llms-source.txt` and remove only the duplicate public shadow. The public URL `/llms.txt` remains unchanged and is served by its App Router endpoint.

### 8. `app/llms.txt/route.js`

Before: reads `public/llms.txt` first and falls back to the older root `llms.txt`.

After: reads the relocated buyer-facing `data/llms-source.txt` only, then applies the existing host normalization and procurement/AI addendum. No content-page, robots or sitemap change is involved.

## Verification gate before publication

1. Run `npm run sync:ai-index` twice and confirm the second run is deterministic.
2. Run `node scripts/verify-protected-invariants.mjs`.
3. Run `npm run build`.
4. Start the production build locally and verify `/ai-index.json` returns 192/45/18, current `generatedAt`, matching classifications and no internal configuration fields; verify `/llms.txt` includes the buyer-facing source and dynamic procurement addendum.
5. Reconfirm product feed count/order, desktop four-column rule and protected-file diff.
6. Confirm `robots.txt`, sitemap routes/files, canonical code, homepage, images, product/blog/news HTML and chat code are not in the Git diff.

## Rollback

- Git rollback point before this repair: merge commit `b7ece6cfe4df8902138a5e1f2fcfa1351052d556`.
- The repair is isolated on branch `codex/fix-ai-index-audit-20260814`.
- If verification or deployment is unsatisfactory, revert only the repair commit or redeploy the preceding production commit. No existing content URL requires a redirect or rollback migration.
