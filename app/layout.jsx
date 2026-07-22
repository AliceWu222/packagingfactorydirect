export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export const metadata = {
  metadataBase: new URL('https://www.packagingfactorydirect.com'),
  title: 'Packaging Factory Direct',
  description: 'B2B custom packaging manufacturer. MOQ 500 PCS. OEM and custom packaging factory.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ]
  }
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://www.packagingfactorydirect.com/#organization',
  name: 'Packaging Factory Direct',
  url: 'https://www.packagingfactorydirect.com',
  logo: 'https://www.packagingfactorydirect.com/logo.png',
  description: 'B2B custom packaging manufacturer. MOQ 500 PCS. OEM and ODM custom packaging factory for boxes, bags, pouches, labels, bottles and printed paper products.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Printing Industrial Park, Longhua District',
    addressLocality: 'Shenzhen',
    addressRegion: 'Guangdong',
    postalCode: '518109',
    addressCountry: 'CN'
  },
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'sales',
    name: 'Linda Wang',
    email: 'linda@colorprintingpackage.com',
    telephone: '+86-181-6573-0353',
    availableLanguage: ['en', 'zh']
  }],
  areaServed: 'Worldwide',
  knowsAbout: [
    'custom packaging boxes',
    'custom gift boxes',
    'magnetic rigid boxes',
    'mailer boxes',
    'stand up pouches',
    'coffee bags with valve',
    'food packaging',
    'cosmetic packaging',
    'pharmaceutical packaging boxes',
    'paper bags',
    'labels and stickers',
    'custom dielines',
    'packaging sampling',
    'packaging quality control'
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Custom Packaging Manufacturing Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom packaging boxes manufacturing' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom gift boxes and magnetic rigid boxes' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom stand up pouches and coffee bags' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom paper bags, labels and stickers' } }
    ]
  },
  sameAs: []
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://www.packagingfactorydirect.com/#website',
  name: 'Packaging Factory Direct',
  url: 'https://www.packagingfactorydirect.com',
  publisher: { '@id': 'https://www.packagingfactorydirect.com/#organization' },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.packagingfactorydirect.com/products.html?q={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
};

const measurementId = process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_GA_ID || '';
const gtmId = process.env.NEXT_PUBLIC_GTM_ID || '';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f3f2c" />
        <meta name="format-detection" content="telephone=yes,email=yes,address=yes" />
        <link rel="preload" as="image" href="/assets/img/hero/hero-1.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/img/hero/mobile-vertical-slide-1.webp" fetchPriority="high" media="(max-width: 760px)" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Packaging Factory Direct LLM summary" />
        <link rel="alternate" type="application/json" href="/ai-discovery.json" title="Packaging Factory Direct AI discovery" />
        <link rel="alternate" type="application/json" href="/ai-index.json" title="Packaging Factory Direct AI index" />
        <link rel="alternate" type="application/json" href="/product-feed.json" title="Packaging Factory Direct product feed" />
        <link rel="stylesheet" href="/assets/css/style.css?v=v97-seo-geo-sitemap-json" />
        <script src="/assets/js/main.js?v=v97-seo-geo-sitemap-json" defer></script>
        {measurementId ? <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}></script> : null}
        {measurementId ? <script dangerouslySetInnerHTML={{ __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: true });
` }} /> : null}
        {gtmId ? <script dangerouslySetInnerHTML={{ __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');
` }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  window.dataLayer = window.dataLayer || [];
  function emit(name, params){
    params = params || {};
    params.page_location = location.href;
    window.dataLayer.push(Object.assign({ event: name }, params));
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }
  function textOf(el){ return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 120); }
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('a,button,input[type="submit"]') : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    var label = textOf(el) || href || el.name || el.id || 'cta';
    var lower = (href + ' ' + label + ' ' + (el.className || '')).toLowerCase();
    if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1 || lower.indexOf('whatsapp') !== -1) emit('whatsapp_click', { link_url: href, link_text: label });
    else if (href.indexOf('mailto:') === 0 || lower.indexOf('email') !== -1) emit('email_click', { link_url: href, link_text: label });
    else if (lower.indexOf('quote') !== -1 || lower.indexOf('rfq') !== -1 || lower.indexOf('request') !== -1) emit('rfq_cta_click', { link_url: href, link_text: label });
    else if (href.indexOf('/products/') !== -1 || lower.indexOf('product') !== -1) emit('product_cta_click', { link_url: href, link_text: label });
  }, true);
  document.addEventListener('submit', function(e){
    var form = e.target;
    var label = form && (form.getAttribute('aria-label') || form.getAttribute('name') || form.id || form.action || 'rfq_form');
    emit('rfq_form_submit', { form_name: String(label).slice(0, 120) });
  }, true);
})();
` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <style dangerouslySetInnerHTML={{ __html: `
/* V80 EMERGENCY OVERRIDE — the original HTML has unclosed <em> tags from a legacy encoding
   corruption, causing the browser to italicize everything after the first <em>.
   This rule forces every em/i to render as upright, and only elements that need italic
   (blockquote, cite, standard prose italic contexts) keep it. This is a visual-only fix
   that does NOT touch the HTML files. */
em, em *, i, i *, .hero em, .hero em *, .hero i, .hero i *,
.floating em, .floating em *, .floating i, .floating i *,
.container em, .container em *,
body em, body em *, body i, body i * { font-style: normal !important; }
/* Restore italics on the very few semantic elements where italic is expected */
cite, cite *, blockquote em, blockquote i, dfn, address i { font-style: italic !important; }
` }} />
        <script dangerouslySetInnerHTML={{ __html: `
/* V81 LOGO REPAIR — the original HTML has "<span class=logo-mark>?/span>" instead of
   "<span class=logo-mark>▱</span>" because a legacy zip extraction corrupted the ▱
   (U+25B1) character and swallowed the following "<". This breaks the DOM so the
   .logo-mark span never closes and swallows the PACKAGING FACTORY DIRECT text into
   the same element. Repair at runtime with DOM surgery, without touching 255+ HTML files. */
(function(){
  function repair(){
    try {
      var logos = document.querySelectorAll('a.logo');
      logos.forEach(function(a){
        // If innerHTML contains the corruption marker, rebuild the logo cleanly
        var html = a.innerHTML || '';
        if (html.indexOf('?/span>') !== -1 || html.indexOf('锟') !== -1 || html.indexOf('\ufffd') !== -1) {
          a.innerHTML = '<span class="logo-mark">\u25B1</span><span>PACKAGING<br/><small>FACTORY DIRECT</small></span>';
        }
      });
    } catch(e){}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', repair);
  } else {
    repair();
  }
})();
` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
