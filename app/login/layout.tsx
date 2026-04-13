import type { Metadata } from "next";

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

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
