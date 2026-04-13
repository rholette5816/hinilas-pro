import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import FloatingChat from "@/components/FloatingChat";
import ReferralToastWrapper from "@/components/ReferralToastWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
  description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — built for serious sellers and ad operators.",
  openGraph: {
    title: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — built for serious sellers and ad operators.",
    url: "https://hinilas-pro.vercel.app",
    siteName: "Hinilas Pro",
    images: [
      {
        url: "https://hinilas-pro.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
        type: "image/jpeg",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — built for serious sellers and ad operators.",
    images: ["https://hinilas-pro.vercel.app/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} text-white antialiased`} style={{ background: "#0B1120" }}>
        <AppProvider>
          {children}
          <FloatingChat />
          <ReferralToastWrapper />
        </AppProvider>
      </body>
    </html>
  );
}
