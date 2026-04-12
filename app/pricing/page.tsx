"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopUpModal from "@/components/TopUpModal";
import { useApp } from "@/lib/context";

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";
const BRAND_RED = "#EF4444";

const FEATURES = [
  {
    category: "AI Tools",
    items: [
      { label: "Market Research", lite: true, flex: true, max: true },
      { label: "Marketing Angles (5 angles + 3C Hook)", lite: true, flex: true, max: true },
      { label: "Sales Copy Writing (PAS, BAB, AIDA, Story)", lite: true, flex: true, max: true },
      { label: "Ad Results Analysis (screenshot upload)", lite: true, flex: true, max: true },
      { label: "Ad Image Generation", lite: "5 only", flex: true, max: true },
    ],
  },
  {
    category: "Premium Features",
    items: [
      { label: "Live Expert Consultation (20 credits/session)", lite: false, flex: true, max: true },
      { label: "Full Meta Ads Course (7 phases, 61 topics)", lite: false, flex: false, max: true },
      { label: "Video Lessons per Topic", lite: false, flex: false, max: true },
      { label: "Downloadable PDF Notes", lite: false, flex: false, max: true },
    ],
  },
  {
    category: "Support",
    items: [
      { label: "Standard Support", lite: true, flex: true, max: true },
      { label: "Priority Support", lite: false, flex: false, max: true },
    ],
  },
];

type FeatureValue = boolean | string;

function Check({ value, color }: { value: FeatureValue; color: string }) {
  if (value === false) return <span className="text-gray-700 text-base">—</span>;
  if (typeof value === "string") return <span className="text-xs font-semibold" style={{ color }}>{value}</span>;
  return <span className="text-base" style={{ color }}>✓</span>;
}

export default function PricingPage() {
  const { plan: currentPlan, credits } = useApp();
  const router = useRouter();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpPackage, setTopUpPackage] = useState<string | undefined>(undefined);

  function openTopUp(packageId: string) {
    setTopUpPackage(packageId);
    setTopUpOpen(true);
  }

  const plans = [
    {
      key: "lite",
      name: "Lite",
      tagline: "Get started for free",
      price: "Free",
      credits: "5 one-time credits",
      threshold: "0 – 49 credits",
      color: "#9CA3AF",
      nextAt: `${49 - credits > 0 ? 49 - credits + " more credits" : ""}`,
    },
    {
      key: "flex",
      name: "Flex",
      tagline: "The engine of your marketing",
      price: "₱999",
      period: " / 150 credits",
      credits: "150 credits — never expires",
      threshold: "50 – 299 credits",
      color: BRAND_ORANGE,
      popular: true,
    },
    {
      key: "max",
      name: "Max",
      tagline: "Unmatched power. Zero limits.",
      price: "₱2,499",
      period: " / 500 credits",
      credits: "500 credits — never expires",
      threshold: "300+ credits",
      color: BRAND_RED,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Credits & Plans</h1>
            <p className="text-gray-400 text-sm">Buy credits once — they never expire. Your tier unlocks automatically based on your <span className="text-white font-medium">credits remaining</span>.</p>
          </div>

          {/* Threshold bar */}
          <div className="rounded-2xl border border-gray-700 px-6 py-5 mb-8" style={{ background: "#0A0F1A" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">Your credits</p>
              <span className="text-sm font-bold" style={{
                color: currentPlan === "max" ? BRAND_RED : currentPlan === "flex" ? BRAND_ORANGE : "#9CA3AF"
              }}>
                {credits} credits — <span className="uppercase">{currentPlan}</span> tier
              </span>
            </div>
            <div className="relative w-full bg-gray-800 rounded-full h-3">
              <div className="absolute top-0 bottom-0 w-px bg-gray-500" style={{ left: `${(50/300)*100}%` }} />
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min((credits / 300) * 100, 100)}%`,
                  background: currentPlan === "max" ? BRAND_RED : currentPlan === "flex" ? BRAND_ORANGE : "#9CA3AF",
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {plans.map(p => {
              const isCurrent = currentPlan === p.key;
              return (
                <div
                  key={p.key}
                  className="rounded-2xl border p-5 flex flex-col relative"
                  style={{
                    background: "#0A0F1A",
                    borderColor: isCurrent ? p.color : "#1F2937",
                    boxShadow: isCurrent ? `0 0 20px ${p.color}20` : "none",
                  }}
                >
                  {p.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: BRAND_ORANGE, color: "#000" }}>
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: p.color }}>
                        Your Tier
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h2 className="text-white font-bold text-xl mb-0.5">Hinilas <span style={{ color: p.color }}>{p.name}</span></h2>
                    <p className="text-gray-500 text-xs">{p.tagline}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-white">{p.price}</span>
                      {"period" in p && <span className="text-gray-500 text-sm mb-1">{p.period}</span>}
                    </div>
                    <p className="text-xs mt-1" style={{ color: p.color }}>{p.credits}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{p.threshold}</p>
                  </div>

                  {isCurrent ? (
                    <div className="mt-auto w-full py-2 rounded-xl text-center text-sm font-semibold border" style={{ borderColor: p.color, color: p.color }}>
                      Active
                    </div>
                  ) : p.key === "lite" ? (
                    <button
                      onClick={() => router.push("/")}
                      className="mt-auto w-full py-2 rounded-xl text-sm font-semibold border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-colors"
                    >
                      Get Started Free
                    </button>
                  ) : p.key === "flex" ? (
                    <button
                      onClick={() => openTopUp("pro_150")}
                      className="mt-auto w-full py-2 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90"
                      style={{ background: BRAND_ORANGE }}
                    >
                      Get Flex — ₱999
                    </button>
                  ) : (
                    <button
                      onClick={() => openTopUp("max_500")}
                      className="mt-auto w-full py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: BRAND_RED }}
                    >
                      Get Max — ₱2,499
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature comparison table — mobile: stacked cards, desktop: grid */}
          <div className="rounded-2xl border border-gray-700 overflow-hidden mb-8" style={{ background: "#0A0F1A" }}>
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-4 px-5 py-3 border-b border-gray-700" style={{ background: "#0F172A" }}>
              <div className="col-span-1" />
              {plans.map(p => (
                <div key={p.key} className="text-center">
                  <p className="text-xs font-bold uppercase" style={{ color: p.color }}>{p.name}</p>
                </div>
              ))}
            </div>

            {/* Desktop rows */}
            <div className="hidden md:block">
              {FEATURES.map(group => (
                <div key={group.category}>
                  <div className="px-5 py-2 border-b border-gray-800" style={{ background: "#0F172A" }}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.category}</p>
                  </div>
                  {group.items.map((item, idx) => (
                    <div
                      key={item.label}
                      className={`grid grid-cols-4 px-5 py-3 items-center ${idx < group.items.length - 1 ? "border-b border-gray-800" : ""}`}
                    >
                      <p className="text-gray-300 text-xs col-span-1 pr-4">{item.label}</p>
                      <div className="text-center"><Check value={item.lite} color="#9CA3AF" /></div>
                      <div className="text-center"><Check value={item.flex} color={BRAND_ORANGE} /></div>
                      <div className="text-center"><Check value={item.max} color={BRAND_RED} /></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Mobile: tier cards */}
            <div className="md:hidden divide-y divide-gray-800">
              {[
                { key: "lite", label: "Lite", color: "#9CA3AF", field: "lite" as const },
                { key: "flex", label: "Flex", color: BRAND_ORANGE, field: "flex" as const },
                { key: "max", label: "Max", color: BRAND_RED, field: "max" as const },
              ].map(tier => (
                <div key={tier.key} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: tier.color }} />
                    <p className="text-sm font-bold uppercase tracking-wide" style={{ color: tier.color }}>
                      Hinilas {tier.label}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {FEATURES.flatMap(group => group.items).map(item => {
                      const value = item[tier.field];
                      return (
                        <div key={item.label} className="flex items-start gap-2">
                          <span className="mt-0.5 text-xs w-4 shrink-0" style={{ color: value === false ? "#374151" : tier.color }}>
                            {value === false ? "—" : "✓"}
                          </span>
                          <span className={`text-xs leading-snug ${value === false ? "text-gray-600" : "text-gray-300"}`}>
                            {item.label}
                            {typeof value === "string" && (
                              <span className="ml-1 font-semibold" style={{ color: tier.color }}>({value})</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top-up */}
          <div id="topup" className="rounded-2xl border border-gray-700 p-6" style={{ background: "#0A0F1A" }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Need more credits?</h3>
                <p className="text-gray-400 text-sm">Need a small top-up? Get 50 credits added to your balance instantly.</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-semibold" style={{ color: BRAND_BLUE }}>₱499 · 50 credits · Never expires</span>
                  <span className="text-gray-700 text-xs">·</span>
                  <span className="text-xs text-gray-600">Adds to your current balance</span>
                </div>
              </div>
              <button
                onClick={() => openTopUp("topup_50")}
                className="shrink-0 text-sm font-bold px-8 py-3 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: BRAND_BLUE, color: "#fff" }}
              >
                Get 50 Credits — ₱499
              </button>
            </div>
          </div>

        </div>
      </main>
      <TopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} defaultPackage={topUpPackage} />
    </div>
  );
}
