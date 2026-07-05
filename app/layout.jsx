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
        <link rel="preload" href="/assets/css/style.css?v=v77-nocrop" as="style" />
        <link rel="stylesheet" href="/assets/css/style.css?v=v77-nocrop" />
        <script src="/assets/js/main.js?v=v77-nocrop" defer></script>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
