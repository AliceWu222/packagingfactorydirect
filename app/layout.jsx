export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export const metadata = {
  metadataBase: new URL('https://packagingfactorydirect.com'),
  title: 'Packaging Factory Direct',
  description: 'B2B custom packaging manufacturer. MOQ 500 PCS. OEM and custom packaging factory.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f3f2c" />
        <meta name="format-detection" content="telephone=yes,email=yes,address=yes" />
        <link rel="preload" as="image" href="/assets/img/hero/hero-1.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/assets/img/hero/mobile-vertical-slide-1.webp" fetchPriority="high" media="(max-width: 760px)" />
        <link rel="preload" href="/assets/css/style.css" as="style" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <script src="/assets/js/main.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
