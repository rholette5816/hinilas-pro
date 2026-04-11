"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp, UserSetup } from "@/lib/context";

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";

export default function SetupPage() {
  const { setup, setSetup } = useApp();
  const router = useRouter();

  const [form, setForm] = useState<UserSetup>(setup || {
    businessName: "",
    product: "",
    targetAudience: "",
    market: "Philippines",
    businessType: "physical_product",
    stage: "just_starting",
    language: "Taglish",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSetup(form);
    router.push("/research");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 border" style={{ background: "#0F172A", borderColor: BRAND_BLUE + "40" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND_BLUE }} />
              <span className="text-xs font-medium" style={{ color: BRAND_BLUE }}>Setup</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Tell us about your business</h1>
            <p className="text-gray-400 text-sm">This powers every module. Be specific — the more detail, the better the output.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Business / Brand Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Glow PH, FitLife Cebu"
                value={form.businessName}
                onChange={e => setForm({ ...form, businessName: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": BRAND_BLUE } as React.CSSProperties}
              />
            </div>

            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">What are you selling?</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Whitening soap for women with sensitive skin, P299/bar, COD available"
                value={form.product}
                onChange={e => setForm({ ...form, product: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none resize-none"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Who is your target customer?</label>
              <input
                type="text"
                required
                placeholder="e.g. Women 18–35 in Visayas who struggle with dark skin"
                value={form.targetAudience}
                onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none"
              />
            </div>

            {/* Market */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Market / Location</label>
              <input
                type="text"
                placeholder="Philippines"
                value={form.market}
                onChange={e => setForm({ ...form, market: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none"
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "physical_product", label: "Physical Product", sub: "Skincare, food, gadgets" },
                  { value: "service", label: "Service", sub: "Freelance, repair, cleaning" },
                  { value: "digital", label: "Digital", sub: "Course, ebook, software" },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setForm({ ...form, businessType: opt.value as UserSetup["businessType"] })}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={form.businessType === opt.value
                      ? { background: BRAND_BLUE, borderColor: BRAND_BLUE, color: "white" }
                      : { background: "#1E293B", borderColor: "#374151", color: "#9CA3AF" }
                    }
                  >
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Where are you now?</label>
              <div className="space-y-2">
                {[
                  { value: "just_starting", label: "Just starting", sub: "No Facebook Page yet, never run ads" },
                  { value: "have_page", label: "Have a page, not running ads", sub: "Set up but no campaigns yet" },
                  { value: "running_ads", label: "Already running ads", sub: "Have campaigns, want better results" },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setForm({ ...form, stage: opt.value as UserSetup["stage"] })}
                    className="w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between"
                    style={form.stage === opt.value
                      ? { background: BRAND_BLUE, borderColor: BRAND_BLUE, color: "white" }
                      : { background: "#1E293B", borderColor: "#374151", color: "#9CA3AF" }
                    }
                  >
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs opacity-70">{opt.sub}</p>
                    </div>
                    {form.stage === opt.value && <span className="text-white text-sm">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language / Dialect</label>
              <p className="text-xs text-gray-500 mb-3">How the AI responds and how ad copy sounds to your target market.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "Taglish", label: "Taglish", sub: "Tagalog + English mix" },
                  { value: "Bislish", label: "Bislish", sub: "Bisaya + English mix" },
                  { value: "Filipino", label: "Filipino/Tagalog", sub: "National language" },
                  { value: "Bisaya", label: "Bisaya/Cebuano", sub: "Visayas and Mindanao" },
                  { value: "Ilocano", label: "Ilocano", sub: "Northern Luzon" },
                  { value: "Hiligaynon", label: "Hiligaynon/Ilonggo", sub: "Western Visayas" },
                  { value: "Kapampangan", label: "Kapampangan", sub: "Pampanga area" },
                  { value: "English", label: "English", sub: "Formal or national brands" },
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setForm({ ...form, language: opt.value })}
                    className="p-3 rounded-lg border text-left transition-all"
                    style={form.language === opt.value
                      ? { background: BRAND_BLUE, borderColor: BRAND_BLUE, color: "white" }
                      : { background: "#1E293B", borderColor: "#374151", color: "#9CA3AF" }
                    }
                  >
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full text-white font-semibold py-3 rounded-lg text-sm transition-opacity hover:opacity-90 mt-2"
              style={{ background: BRAND_ORANGE }}
            >
              Save & Start →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
