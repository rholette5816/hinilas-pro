import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hinilas Pro — AI Driven. Results Focused.",
  description: "Your AI-powered Digital Marketing Assistant. Market research, ad angles, copy, creatives, and results analysis — powered by the Basta Mag Ads Hilas framework.",
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
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
