export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeMetric(value) {
  const metric = value && typeof value === 'object' ? value : {};
  return {
    name: String(metric.name || '').slice(0, 16),
    value: Number(metric.value || 0),
    rating: String(metric.rating || '').slice(0, 24),
    path: String(metric.path || '').replace(/[?#].*$/, '').slice(0, 180),
    pageType: String(metric.pageType || '').slice(0, 40),
    id: String(metric.id || '').slice(0, 80),
    ts: Number(metric.ts || Date.now())
  };
}

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const items = Array.isArray(payload) ? payload : [payload];
  const metrics = items.map(sanitizeMetric).filter(item => item.name && Number.isFinite(item.value));
  if (metrics.length) {
    console.log(JSON.stringify({ event: 'pfd_web_vitals', metrics }));
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

export async function GET() {
  return Response.json({
    status: 'ok',
    endpoint: '/api/web-vitals',
    metrics: ['LCP', 'CLS', 'INP'],
    sampling: 'browser-side sampled anonymous field metrics'
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}
