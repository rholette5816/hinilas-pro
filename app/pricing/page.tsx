"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/lib/context";

const PLANS = [
  {
    key: "lite",
    name: "Hinilas Lite",
    tagline: "Taste the Speed",
    price: "Free",
    credits: "5 one-time credits",
    features: ["5 ad image generations", "Unlimited text generation", "All AI modules", "Standard quality"],
    highlight: false,
  },
  {
    key: "pro",
    name: "Hinilas Flex",
    tagline: "The Engine of Your Marketing",
    price: "₱999",
    period: "/month",
    credits: "150 credits/month",
    features: ["150 image generations/month", "Unlimited text generation", "All AI modules", "Gemini 3.1 Flash speed", "Standard support"],
    highlight: true,
  },
  {
    key: "max",
    name: "Hinilas Max",
    tagline: "Unmatched Power. Zero Limits.",
    price: "₱2,499",
    period: "/month",
    credits: "500 credits/month",
    features: ["500 image generations/month", "Unlimited text generation", "All AI modules", "Bulk generation mode", "Priority support", "Agency Dashboard"],
    highlight: false,
  },
];

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";

export default function PricingPage() {
  const { plan: currentPlan } = useApp();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h1>
            <p className="text-gray-400 text-sm">1 credit = 1 image generation. Text generation is always unlimited.</p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {PLANS.map(p => {
              const isCurrent = currentPlan === p.key;
              return (
                <div
                  key={p.key}
                  className="rounded-2xl border p-6 flex flex-col"
                  style={{
                    background: p.highlight ? "#0F172A" : "#0A0F1A",
                    borderColor: p.highlight ? BRAND_ORANGE : "#1F2937",
                    boxShadow: p.highlight ? `0 0 24px ${BRAND_ORANGE}20` : "none",
                  }}
                >
                  {p.highlight && (
                    <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 mb-3 self-start text-xs font-semibold" style={{ background: BRAND_ORANGE, color: "#000" }}>
                      Most Popular
                    </div>
                  )}

                  <p className="text-xs font-medium mb-1" style={{ color: BRAND_BLUE }}>{p.tagline}</p>
                  <h2 className="text-white font-bold text-lg mb-1">{p.name}</h2>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold text-white">{p.price}</span>
                    {"period" in p && p.period && <span className="text-gray-400 text-sm mb-1">{p.period}</span>}
                  </div>
                  <p className="text-xs mb-5" style={{ color: BRAND_ORANGE }}>{p.credits}</p>

                  <ul className="space-y-2 flex-1 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <span style={{ color: BRAND_BLUE }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-lg text-center text-sm font-semibold border border-gray-600 text-gray-400">
                      Current Plan
                    </div>
                  ) : p.key === "lite" ? (
                    <button
                      onClick={() => router.push("/")}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                    >
                      Get Started Free
                    </button>
                  ) : (
                    <div className="w-full py-2.5 rounded-lg text-center text-sm font-semibold border border-gray-700 text-gray-500">
                      Coming Soon
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top-up section */}
          <div id="topup" className="rounded-2xl border border-gray-700 p-6" style={{ background: "#0A0F1A" }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Need more credits?</h3>
                <p className="text-gray-400 text-sm">The Refill Pack — 50 instant credits. No plan change needed.</p>
                <p className="text-xs mt-1" style={{ color: BRAND_ORANGE }}>₱499 · 50 credits · Never expires</p>
              </div>
              <div className="shrink-0 text-gray-500 text-sm font-semibold px-8 py-3 rounded-lg border border-gray-700 text-center">
                Coming Soon
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
