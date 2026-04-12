"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/lib/context";

const PLANS = [
  {
    key: "lite",
    name: "Hinilas Lite",
    tagline: "Get Started Free",
    price: "Free",
    credits: "5 one-time credits",
    threshold: "0 – 49 credits",
    features: [
      "Market Research",
      "Angle Generation",
      "Sales Copy Writing",
      "Ad Results Analysis",
      "5 image generations",
    ],
    locked: ["Ask Expert locked", "Courses locked"],
    highlight: false,
  },
  {
    key: "flex",
    name: "Hinilas Flex",
    tagline: "The Engine of Your Marketing",
    price: "₱999",
    period: "/month",
    credits: "150 credits/month",
    threshold: "50 – 299 credits",
    features: [
      "Everything in Lite",
      "Ad image generation",
      "Ask Expert — 10 credits/session",
      "Unlimited text generation",
    ],
    locked: ["Courses locked"],
    highlight: true,
  },
  {
    key: "max",
    name: "Hinilas Max",
    tagline: "Unmatched Power. Zero Limits.",
    price: "₱2,499",
    period: "/month",
    credits: "500 credits/month",
    threshold: "300+ credits",
    features: [
      "Everything in Flex",
      "Full Meta Ads Course — 7 phases",
      "Video lessons + PDF downloads",
      "Priority support",
    ],
    locked: [],
    highlight: false,
  },
];

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";

export default function PricingPage() {
  const { plan: currentPlan, credits } = useApp();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-white mb-3">Credits & Plans</h1>
            <p className="text-gray-400 text-sm">Your tier is determined by your <span className="text-white font-medium">credits remaining</span>. More credits = more features unlocked.</p>
          </div>

          {/* Threshold visual */}
          <div className="rounded-2xl border border-gray-700 px-6 py-5 mb-8" style={{ background: "#0A0F1A" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Your current credits</p>
              <span className="text-sm font-bold" style={{
                color: currentPlan === "max" ? BRAND_ORANGE : currentPlan === "flex" ? BRAND_BLUE : "#6B7280"
              }}>
                {credits} credits — {currentPlan === "max" ? "MAX" : currentPlan === "flex" ? "FLEX" : "LITE"} tier
              </span>
            </div>
            <div className="relative w-full bg-gray-800 rounded-full h-3">
              <div className="absolute top-0 bottom-0 w-px bg-gray-500" style={{ left: `${(50/300)*100}%` }} />
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min((credits / 300) * 100, 100)}%`,
                  background: currentPlan === "max" ? BRAND_ORANGE : currentPlan === "flex" ? BRAND_BLUE : "#6B7280",
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>0 — Lite</span>
              <span>50 — Flex unlocks</span>
              <span>300 — Max unlocks</span>
            </div>
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
                    borderColor: isCurrent
                      ? (p.key === "max" ? BRAND_ORANGE : BRAND_BLUE)
                      : p.highlight ? BRAND_ORANGE + "60" : "#1F2937",
                    boxShadow: isCurrent ? `0 0 24px ${BRAND_BLUE}20` : p.highlight ? `0 0 24px ${BRAND_ORANGE}15` : "none",
                  }}
                >
                  {isCurrent && (
                    <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 mb-3 self-start text-xs font-semibold" style={{ background: p.key === "max" ? BRAND_ORANGE : BRAND_BLUE, color: "#000" }}>
                      Your Current Tier
                    </div>
                  )}
                  {!isCurrent && p.highlight && (
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
                  <div className="flex items-center gap-2 mb-5">
                    <p className="text-xs" style={{ color: BRAND_ORANGE }}>{p.credits}</p>
                    <span className="text-gray-700 text-xs">·</span>
                    <p className="text-xs text-gray-600">{p.threshold}</p>
                  </div>

                  <ul className="space-y-2 flex-1 mb-3">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <span style={{ color: BRAND_BLUE }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {p.locked.length > 0 && (
                    <ul className="space-y-1 mb-5">
                      {p.locked.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                          <span>🔒</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-lg text-center text-sm font-semibold border text-white" style={{ borderColor: p.key === "max" ? BRAND_ORANGE : BRAND_BLUE }}>
                      Active
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
                <p className="text-gray-400 text-sm">The Refill Pack — 50 instant credits. Enough to unlock Flex tier.</p>
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
