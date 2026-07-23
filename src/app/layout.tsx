import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import Script from "next/script";
import "@/styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/lib/theme";
import PageTransition from "@/components/PageTransition";
import LazyExtras from "@/components/LazyExtras";
import { siteMetadata, buildAlternates, buildOpenGraph } from "@/lib/siteMetadata";

const GA_MEASUREMENT_ID = 'G-0R77Z2VFWT';

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

const inter = Inter({
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-inter',
});

const lora = Lora({
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-lora',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: siteMetadata.title,
    template: `%s | ${siteMetadata.authorName}`
  },
  description: siteMetadata.description,
  keywords: ["AI security", "RAG Security", "RAG", "LLM", "machine learning", "adversarial attacks", "research"],
  authors: [{ name: siteMetadata.authorName }],
  creator: siteMetadata.authorName,
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  alternates: buildAlternates(),
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification ? { other: { 'msvalidate.01': bingVerification } } : {}),
  },
  openGraph: buildOpenGraph({
    type: "website",
    url: siteMetadata.siteUrl,
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [siteMetadata.ogImage],
  }),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans">
        {/* Apply the stored/system theme before first paint to avoid a light flash.
            Must mirror ThemeProvider in src/lib/theme.tsx: 'theme' key, 'dark' class. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}",
          }}
        />
        {/* Report uncaught errors / unhandled rejections to GA4 as non-fatal
            exception events. Guarded so it never throws when gtag is absent
            (gtag loads lazyOnload — earlier errors are dropped), dedupes
            identical messages, and caps at 10 events per page. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var _seen=new Set(),_sent=0;function _rep(d){try{if(_sent>=10||_seen.has(d))return;_seen.add(d);_sent++;if(typeof window.gtag==='function'){window.gtag('event','exception',{description:d.slice(0,150),fatal:false});}}catch(e){}}window.addEventListener('error',function(e){_rep((e.message||'error')+' @'+(e.filename||'')+':'+(e.lineno||0));});window.addEventListener('unhandledrejection',function(e){var m;try{m=e.reason&&e.reason.message?e.reason.message:String(e.reason);}catch(x){m='unhandledrejection';}_rep('unhandledrejection: '+m);});}catch(e){}",
          }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--color-bg-secondary)] focus:text-[var(--color-text)]">
          Skip to main content
        </a>
        <ThemeProvider>
          <Header />
          <main id="main-content" className="pt-[var(--header-height)] min-h-screen">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
          <LazyExtras />
        </ThemeProvider>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="lazyOnload">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
        </Script>
      </body>
    </html>
  );
}
