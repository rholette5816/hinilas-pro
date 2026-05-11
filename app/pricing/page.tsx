"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GCashModal from "@/components/GCashModal";
import { useApp } from "@/lib/context";

const BRAND_BLUE = "#1E3A8A";
const BRAND_ORANGE = "#D97706";
const BRAND_RED = "#EF4444";

const FEATURES = [
  {
    category: "AI Tools",
    items: [
      { label: "Market Research", lite: true, flex: true, max: true },
      { label: "Marketing Angles (5 angles + 3C Hook)", lite: true, flex: true, max: true },
      { label: "Sales Copy Writing (PAS, BAB, AIDA, Story)", lite: true, flex: true, max: true },
      { label: "Ad Results Analysis (screenshot upload)", lite: true, flex: true, max: true },
      { label: "Ad Image Generation", lite: true, flex: true, max: true },
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
  if (value === false) return <span className="text-xs font-semibold text-slate-400">Not included</span>;
  if (typeof value === "string") return <span className="text-xs font-semibold" style={{ color }}>{value}</span>;
  return <span className="text-xs font-black uppercase tracking-wide" style={{ color }}>Included</span>;
}

export default function PricingPage() {
  const { plan: currentPlan, credits } = useApp();
  const router = useRouter();
  const [gcash, setGcash] = useState<{ label: string; credits: number; price: number; color: string } | null>(null);

  const plans = [
    {
      key: "lite",
      name: "Lite",
      tagline: "Get started for free",
      price: "Free",
      credits: "30 free credits (15 + 15 after first action)",
      threshold: "0 - 49 credits",
      color: "#9CA3AF",
      nextAt: `${49 - credits > 0 ? 49 - credits + " more credits" : ""}`,
    },
    {
      key: "flex",
      name: "Flex",
      tagline: "The engine of your marketing",
      price: "PHP 499",
      period: " / 150 credits",
      credits: "150 credits - never expires",
      threshold: "50 - 299 credits",
      color: BRAND_ORANGE,
      popular: true,
    },
    {
      key: "max",
      name: "Max",
      tagline: "Unmatched power. Zero limits.",
      price: "PHP 1,299",
      period: " / 500 credits",
      credits: "500 credits - never expires",
      threshold: "300+ credits",
      color: BRAND_RED,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8FAFC" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Credits & Plans</h1>
            <p className="text-slate-600 text-sm">Buy credits once. Flex and Max <span className="text-slate-900 font-medium">lock your tier for 30 days</span>. After that, tier auto-adjusts based on credits remaining.</p>
          </div>

          {/* Threshold bar */}
          <div className="rounded-2xl px-6 py-5 mb-8" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Your credits</p>
              <span
                className="text-sm font-bold"
                style={{
                  color: currentPlan === "max" ? BRAND_RED : currentPlan === "flex" ? BRAND_ORANGE : "#9CA3AF",
                }}
              >
                {credits} credits - <span className="uppercase">{currentPlan}</span> tier
              </span>
            </div>
            <div className="relative w-full bg-slate-100 rounded-full h-3">
              <div className="absolute top-0 bottom-0 w-px bg-gray-500" style={{ left: `${(50 / 300) * 100}%` }} />
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min((credits / 300) * 100, 100)}%`,
                  background: currentPlan === "max" ? BRAND_RED : currentPlan === "flex" ? BRAND_ORANGE : "#9CA3AF",
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>0 - Lite</span>
              <span>50 - Flex unlocks</span>
              <span>300 - Max unlocks</span>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {plans.map((p) => {
              const isCurrent = currentPlan === p.key;
              return (
                <div
                  key={p.key}
                  className="rounded-2xl border p-5 flex flex-col relative"
                  style={{
                    background: "#FFFFFF",
                    borderColor: isCurrent ? p.color : "#E2E8F0",
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
                    <h2 className="text-slate-900 font-bold text-xl mb-0.5">
                      Hinilas <span style={{ color: p.color }}>{p.name}</span>
                    </h2>
                    <p className="text-slate-500 text-xs">{p.tagline}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                      {"period" in p && <span className="text-slate-500 text-sm mb-1">{p.period}</span>}
                    </div>
                    <p className="text-xs mt-1" style={{ color: p.color }}>{p.credits}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.threshold}</p>
                  </div>

                  {isCurrent ? (
                    <div className="mt-auto w-full py-2 rounded-xl text-center text-sm font-semibold border" style={{ borderColor: p.color, color: p.color }}>
                      Active
                    </div>
                  ) : p.key === "lite" ? (
                    <button
                      onClick={() => router.push("/")}
                      className="mt-auto w-full py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                      style={{ border: "1px solid #E2E8F0" }}
                    >
                      Get Started Free
                    </button>
                  ) : p.key === "flex" ? (
                    <button
                      disabled={currentPlan === "max"}
                      onClick={() => currentPlan !== "max" && setGcash({ label: "Flex", credits: 150, price: 499, color: BRAND_ORANGE })}
                      className="mt-auto w-full py-2 rounded-xl text-sm font-bold transition-opacity"
                      style={{
                        background: currentPlan === "max" ? "#F1F5F9" : BRAND_ORANGE,
                        color: currentPlan === "max" ? "#64748B" : "#000",
                        cursor: currentPlan === "max" ? "not-allowed" : "pointer",
                      }}
                    >
                      Get Flex - PHP 499
                    </button>
                  ) : (
                    <button
                      onClick={() => setGcash({ label: "Max", credits: 500, price: 1299, color: BRAND_RED })}
                      className="mt-auto w-full py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: BRAND_RED }}
                    >
                      Get Max - PHP 1,299
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature comparison table - mobile: stacked cards, desktop: grid */}
          <div className="rounded-2xl overflow-hidden mb-8" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-4 px-5 py-3" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
              <div className="col-span-1" />
              {plans.map((p) => (
                <div key={p.key} className="text-center">
                  <p className="text-xs font-bold uppercase" style={{ color: p.color }}>{p.name}</p>
                </div>
              ))}
            </div>

            {/* Desktop rows */}
            <div className="hidden md:block">
              {FEATURES.map((group) => (
                <div key={group.category}>
                  <div className="px-5 py-2" style={{ background: "#F1F5F9", borderBottom: "1px solid #E2E8F0" }}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group.category}</p>
                  </div>
                  {group.items.map((item, idx) => (
                    <div
                      key={item.label}
                      className={`grid grid-cols-4 px-5 py-3 items-center ${idx < group.items.length - 1 ? "border-b border-slate-200" : ""}`}
                    >
                      <p className="text-slate-700 text-xs col-span-1 pr-4">{item.label}</p>
                      <div className="text-center"><Check value={item.lite} color="#9CA3AF" /></div>
                      <div className="text-center"><Check value={item.flex} color={BRAND_ORANGE} /></div>
                      <div className="text-center"><Check value={item.max} color={BRAND_RED} /></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Mobile: tier cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {[
                { key: "lite", label: "Lite", color: "#9CA3AF", field: "lite" as const },
                { key: "flex", label: "Flex", color: BRAND_ORANGE, field: "flex" as const },
                { key: "max", label: "Max", color: BRAND_RED, field: "max" as const },
              ].map((tier) => (
                <div key={tier.key} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: tier.color }} />
                    <p className="text-sm font-bold uppercase tracking-wide" style={{ color: tier.color }}>
                      Hinilas {tier.label}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {FEATURES.flatMap((group) => group.items).map((item) => {
                      const value = item[tier.field];
                      return (
                        <div key={item.label} className="flex items-start gap-2">
                          <span className="mt-0.5 text-xs w-4 shrink-0" style={{ color: value === false ? "#64748B" : tier.color }}>
                            {value === false ? "-" : "Yes"}
                          </span>
                          <span className={`text-xs leading-snug ${value === false ? "text-slate-500" : "text-slate-700"}`}>
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

          {/* Top-up tiers */}
          <div className="mt-8 mb-12">
            <div className="mb-4">
              <h3 className="text-slate-900 font-bold text-lg mb-1">Need more credits?</h3>
              <p className="text-slate-600 text-sm">Top-up credits never expire. They do not lock a tier - your plan stays as it is.</p>
            </div>

            <div id="topup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Small", modalLabel: "Top-Up Small", credits: 25, price: 99, perCredit: "P3.96/cr" },
                { label: "Medium", modalLabel: "Top-Up Medium", credits: 50, price: 179, perCredit: "P3.58/cr" },
                { label: "Large", modalLabel: "Top-Up Large", credits: 100, price: 299, perCredit: "P2.99/cr", best: true },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setGcash({ label: opt.modalLabel, credits: opt.credits, price: opt.price, color: BRAND_BLUE })}
                  className="relative hover:border-blue-500 rounded-xl p-4 text-left transition-colors"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                >
                  {opt.best && (
                    <span className="absolute -top-2 right-3 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white" style={{ background: BRAND_BLUE }}>
                      Best value
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: BRAND_BLUE }}>{opt.label}</p>
                  <p className="text-slate-900 font-bold text-2xl mb-0.5">
                    {opt.credits} <span className="text-sm font-medium text-slate-600">credits</span>
                  </p>
                  <p className="text-slate-700 text-sm font-semibold mb-1">P{opt.price}</p>
                  <p className="text-slate-500 text-xs">{opt.perCredit} - never expires</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      {gcash && (
        <GCashModal
          isOpen={!!gcash}
          onClose={() => setGcash(null)}
          label={gcash.label}
          credits={gcash.credits}
          price={gcash.price}
          color={gcash.color}
        />
      )}
    </div>
  );
}
