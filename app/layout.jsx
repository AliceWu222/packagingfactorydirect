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
  sameAs: []
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Packaging Factory Direct',
  url: 'https://www.packagingfactorydirect.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.packagingfactorydirect.com/products.html?q={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f3f2c" />
        <meta name="format-detection" content="telephone=yes,email=yes,address=yes" />
        <link rel="preload" as="image" href="/assets/img/hero/hero-1.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/img/hero/mobile-vertical-slide-1.webp" fetchPriority="high" media="(max-width: 760px)" />
        <link rel="preload" href="/assets/css/style.css?v=v94-hero-product-safe" as="style" />
        <link rel="stylesheet" href="/assets/css/style.css?v=v94-hero-product-safe" />
        <script src="/assets/js/main.js?v=v94-hero-product-safe" defer></script>
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
