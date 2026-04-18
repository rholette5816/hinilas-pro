import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import FloatingChatWrapper from "@/components/FloatingChatWrapper";
import ReferralToastWrapper from "@/components/ReferralToastWrapper";
import TopBar from "@/components/TopBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
  description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — built for serious sellers and ad operators.",
  openGraph: {
    title: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — built for serious sellers and ad operators.",
    url: "https://hinilas.pro",
    siteName: "Hinilas Pro",
    images: [
      {
        url: "https://content.pancake.vn/web-media-262/a7/e8/63/29/b7657ced4e58f7fe6aab5716e5ecdb51267aaa1f8069580980bd875c-w:1731-h:909-l:2364628-t:image/png.jpg",
        width: 1200,
        height: 630,
        alt: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
        type: "image/png",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — built for serious sellers and ad operators.",
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
      <body className={`${inter.className} text-white antialiased`} style={{ background: "#0B1120" }}>
        {/* Subtle background orbs — app-wide */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
          <style>{`
            @keyframes appOrb1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(50px,40px) scale(1.08); } }
            @keyframes appOrb2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-40px,-30px) scale(1.06); } }
            @keyframes appOrb3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(30px,-40px) scale(1.05); } }
          `}</style>
          <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(120px)", opacity: 0.18, width: 700, height: 700, background: "#2B7EC9", top: -200, left: -200, animation: "appOrb1 18s ease-in-out infinite alternate" }} />
          <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(120px)", opacity: 0.13, width: 600, height: 600, background: "#F5A623", bottom: -150, right: -150, animation: "appOrb2 14s ease-in-out infinite alternate" }} />
          <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(140px)", opacity: 0.1, width: 500, height: 500, background: "#8B5CF6", top: "40%", left: "50%", animation: "appOrb3 20s ease-in-out infinite alternate" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #1E3A5F 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.2 }} />
        </div>
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
