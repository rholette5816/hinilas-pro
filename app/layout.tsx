import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import FloatingChat from "@/components/FloatingChat";
import ReferralToastWrapper from "@/components/ReferralToastWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hinilas Pro — AI Driven. Results Focused.",
  description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — powered by the Basta Mag Ads Hilas framework.",
  openGraph: {
    title: "Hinilas Pro — AI Driven. Results Focused.",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup — powered by the Basta Mag Ads Hilas framework.",
    url: "https://hinilas-pro.vercel.app",
    siteName: "Hinilas Pro",
    images: [
      {
        url: "https://hinilas-pro.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hinilas Pro — AI Driven. Results Focused.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hinilas Pro — AI Driven. Results Focused.",
    description: "Your AI-powered Meta Ads assistant. Market research, ad angles, sales copy, creatives, and campaign setup.",
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
