import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "Minseok (Denis) Kim - AI & Security Researcher",
    template: "%s | Minseok (Denis) Kim"
  },
  description: "Research portfolio of Minseok (Denis) Kim, focusing on AI security, RAG systems, LLM safety, and adversarial machine learning.",
  keywords: ["AI security", "RAG", "LLM", "machine learning", "adversarial attacks", "research"],
  authors: [{ name: "Minseok (Denis) Kim" }],
  creator: "Minseok (Denis) Kim",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://deniskimskku.github.io",
    title: "Minseok (Denis) Kim - AI & Security Researcher",
    description: "Research portfolio focusing on AI security, RAG systems, and LLM safety",
    siteName: "Denis Kim Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minseok (Denis) Kim - AI & Security Researcher",
    description: "Research portfolio focusing on AI security, RAG systems, and LLM safety",
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <Header />
          <main className="pt-[var(--header-height)] min-h-screen">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
