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
        url: "https://content.pancake.vn/web-media-262/a7/e8/63/29/b7657ced4e58f7fe6aab5716e5ecdb51267aaa1f8069580980bd875c-w:1731-h:909-l:2364628-t:image/png.jpg",
        width: 1200,
        height: 630,
        alt: "Hinilas Pro — The Meta Ads AI Tool for Filipino Sellers",
        type: "image/jpg",
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

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
