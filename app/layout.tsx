import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import FloatingChatWrapper from "@/components/FloatingChatWrapper";
import ReferralToastWrapper from "@/components/ReferralToastWrapper";
import TopBar from "@/components/TopBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hinilas Pro - The Meta Ads AI Tool for Filipino Sellers",
  description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup built for serious sellers and ad operators.",
  openGraph: {
    title: "Hinilas Pro - The Meta Ads AI Tool for Filipino Sellers",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup built for serious sellers and ad operators.",
    url: "https://hinilas.pro",
    siteName: "Hinilas Pro",
    images: [
      {
        url: "https://content.pancake.vn/web-media-262/a7/e8/63/29/b7657ced4e58f7fe6aab5716e5ecdb51267aaa1f8069580980bd875c-w:1731-h:909-l:2364628-t:image/png.jpg",
        width: 1200,
        height: 630,
        alt: "Hinilas Pro - The Meta Ads AI Tool for Filipino Sellers",
        type: "image/png",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hinilas Pro - The Meta Ads AI Tool for Filipino Sellers",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup built for serious sellers and ad operators.",
    images: ["https://content.pancake.vn/web-media-262/a7/e8/63/29/b7657ced4e58f7fe6aab5716e5ecdb51267aaa1f8069580980bd875c-w:1731-h:909-l:2364628-t:image/png.jpg"],
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
      <body className={`${inter.className} text-slate-900 antialiased`} style={{ background: "#F0F2F5" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <AppProvider>
            <TopBar />
            {children}
            <FloatingChatWrapper />
            <ReferralToastWrapper />
          </AppProvider>
        </div>
      </body>
    </html>
  );
}
