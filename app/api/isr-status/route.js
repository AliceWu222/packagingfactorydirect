export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.PFD_CONTENT_BASE_URL || process.env.R2_PUBLIC_BASE_URL || process.env.CMS_CONTENT_BASE_URL || '';
  return Response.json({
    ok: true,
    mode: 'r2-cms-html-source-with-isr',
    r2OrCmsBaseConfigured: Boolean(base),
    contentBaseUrl: base ? 'configured' : 'not configured',
    isr: {
      revalidateSeconds: Number(process.env.PFD_ISR_SECONDS || process.env.PRODUCT_PAGE_REVALIDATE_SECONDS || 3600),
      dynamicParams: true,
      detailPagePolicy: 'If a products/blog/news HTML file is not local, the app fetches the matching path from R2/CMS, renders it, and caches it by ISR.',
      listingPolicy: 'products.html, blog.html and news.html can inject remote cards from data/products.remote.json, data/blog.remote.json and data/news.remote.json.'
    },
    requiredEnvironmentVariables: {
      PFD_CONTENT_BASE_URL: 'R2 public/custom domain base URL, for example https://static.yourdomain.com/',
      REVALIDATE_SECRET: 'secret required for /api/revalidate',
      PFD_ISR_SECONDS: 'optional cache seconds, default 3600',
      PFD_REMOTE_CONTENT_FIRST: 'optional true if R2/CMS should override local detail HTML',
      PFD_ENABLE_REMOTE_LISTS: 'optional false to disable remote listing injection'
    }
  });
}
