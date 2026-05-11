"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useApp, UserSetup } from "@/lib/context";

const BRAND_BLUE = "#1E3A8A";
const BRAND_ORANGE = "#D97706";


const PH_INDUSTRIES = [
  { value: "skincare_beauty", label: "Skincare / Beauty" },
  { value: "supplements_health", label: "Supplements / Health" },
  { value: "fashion_clothing", label: "Fashion / Clothing / Shoes" },
  { value: "jewelry_accessories", label: "Jewelry / Accessories" },
  { value: "food_beverage", label: "Food / Beverage Products" },
  { value: "dental_clinic", label: "Dental / Medical Clinic" },
  { value: "spa_wellness", label: "Spa / Wellness / Massage" },
  { value: "salon_barbershop", label: "Salon / Barbershop" },
  { value: "fitness_gym", label: "Fitness / Gym" },
  { value: "restaurant", label: "Restaurant / Food Business" },
  { value: "real_estate", label: "Real Estate" },
  { value: "lending_loans", label: "Lending / Cash Loans" },
  { value: "insurance", label: "Insurance / Life Insurance" },
  { value: "online_course", label: "Online Course / Coaching" },
  { value: "recruitment", label: "Recruitment / Manpower" },
  { value: "printing_customized", label: "Printing / Customized Products" },
  { value: "events_photo_video", label: "Events / Photo / Video" },
  { value: "auto_accessories", label: "Auto / Car Accessories" },
  { value: "repair_services", label: "Repair / Appliance Services" },
  { value: "digital_services", label: "Digital / Marketing Services" },
];

const STAGES = [
  { value: "just_starting", label: "Just Starting", sub: "No Facebook Page yet, never run ads" },
  { value: "have_page", label: "Have a Page", sub: "Set up but no campaigns yet" },
  { value: "running_ads", label: "Running Ads", sub: "Have campaigns, want better results" },
];

const LANGUAGES = [
  { value: "Taglish", label: "Taglish", sub: "Tagalog + English" },
  { value: "Bislish", label: "Bislish", sub: "Bisaya + English" },
  { value: "Filipino", label: "Filipino", sub: "National language" },
  { value: "Bisaya", label: "Bisaya", sub: "Visayas & Mindanao" },
  { value: "Ilocano", label: "Ilocano", sub: "Northern Luzon" },
  { value: "Hiligaynon", label: "Hiligaynon", sub: "Western Visayas" },
  { value: "Kapampangan", label: "Kapampangan", sub: "Pampanga area" },
  { value: "English", label: "English", sub: "Global / formal" },
];

export default function SetupPage() {
  const { setup, setSetup } = useApp();
  const router = useRouter();

  const [form, setForm] = useState<UserSetup>(setup || {
    businessName: "",
    product: "",
    targetAudience: "",
    uniqueSellingOffer: "",
    market: "Philippines",
    businessType: "physical_product",
    stage: "just_starting",
    language: "Taglish",
    industry: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSetup(form);
    router.push("/research");
  }

  function handleSaveDraft() {
    setSetup(form);
  }

  const { setResearchOutput, setAnglesOutput, setCopyOutput, setSelectedAngle } = useApp();
  const [clearing, setClearing] = useState(false);

  async function handleClearData() {
    if (!confirm("Clear all your setup, research, angles, and copy data? This cannot be undone.")) return;
    setClearing(true);
    const blankSetup: UserSetup = {
      businessName: "", product: "", targetAudience: "", uniqueSellingOffer: "",
      market: "Philippines", businessType: "physical_product", stage: "just_starting", language: "Taglish", industry: "",
    };
    setForm(blankSetup);
    setSetup(blankSetup);
    setResearchOutput("");
    setAnglesOutput("");
    setCopyOutput("");
    setSelectedAngle("");
    setClearing(false);
  }

  const setupDone = !!(setup?.businessName);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#FFFFFF" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-12 pb-32">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: BRAND_BLUE }}>1</div>
                <span className="text-sm font-semibold" style={{ color: BRAND_BLUE }}>Intelligence Setup</span>
              </div>
              <div className="flex-1 h-px max-w-[60px]" style={{ background: "#E2E8F0" }} />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#F1F5F9", color: "#64748B" }}>2</div>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>Market Analysis</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-black text-slate-900 mb-2">Business Intelligence Profile</h1>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Tell us about your business to power your AI-driven marketing engine. Our intelligence models use these details to craft high-conversion strategies.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Industry */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#64748B" }}>Industry</label>
                <p className="text-xs mb-3" style={{ color: "#64748B" }}>Helps the AI generate creatives that match your industry&apos;s visual style.</p>
                <select
                  value={form.industry || ""}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all appearance-none"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: form.industry ? "#0F172A" : "#64748B" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                >
                  <option value="" style={{ background: "#FFFFFF", color: "#64748B" }}>Select your industry...</option>
                  {PH_INDUSTRIES.map(ind => (
                    <option key={ind.value} value={ind.value} style={{ background: "#FFFFFF", color: "#0F172A" }}>{ind.label}</option>
                  ))}
                </select>
              </div>

              {/* Business Name + Market */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#64748B" }}>Business name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hinilas Pro"
                    value={form.businessName}
                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 placeholder-gray-400 focus:outline-none transition-all"
                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                    onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                    onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                  />
                  <p className="text-xs text-slate-400 mt-1">Pangalan ng iyong business o brand</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "#64748B" }}>Market / location</label>
                  <input
                    type="text"
                    placeholder="e.g. Global, North America"
                    value={form.market}
                    onChange={e => setForm({ ...form, market: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 placeholder-gray-400 focus:outline-none transition-all"
                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                    onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                    onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                  />
                </div>
              </div>

              {/* Product */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#64748B" }}>What are you selling?</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe your main product or offering..."
                  value={form.product}
                  onChange={e => setForm({ ...form, product: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 placeholder-gray-400 focus:outline-none resize-none transition-all"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                />
                <p className="text-xs text-slate-400 mt-1">Describe your product or service in simple words</p>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "#64748B" }}>Target customer</label>
                <input
                  type="text"
                  required
                  placeholder="Define your ideal persona (e.g. Mid-level marketers in tech)..."
                  value={form.targetAudience}
                  onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 placeholder-gray-400 focus:outline-none transition-all"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                />
                <p className="text-xs text-slate-400 mt-1">Who usually buys from you? Age, gender, location</p>
              </div>

              {/* USP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold" style={{ color: "#64748B" }}>Unique selling offer (USP)</label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(217,119,6,0.1)", color: BRAND_ORANGE, border: `1px solid ${BRAND_ORANGE}30` }}>AI optimized</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="What makes you stand out from the competition?"
                  value={form.uniqueSellingOffer}
                  onChange={e => setForm({ ...form, uniqueSellingOffer: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 placeholder-gray-400 focus:outline-none resize-none transition-all"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#E2E8F0"}
                />
                <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Include price, freebies, guarantee, urgency — anything that makes them act.</p>
              </div>

              {/* Stage */}
              <div>
                <label className="block text-xs font-semibold mb-3" style={{ color: "#64748B" }}>Your current stage</label>
                <div className="space-y-2">
                  {STAGES.map(opt => {
                    const active = form.stage === opt.value as UserSetup["stage"];
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm({ ...form, stage: opt.value as UserSetup["stage"] })}
                        className="w-full p-3.5 rounded-xl text-left flex items-center justify-between transition-all"
                        style={active
                          ? { background: "rgba(30,58,138,0.12)", border: `1px solid ${BRAND_BLUE}` }
                          : { background: "#FFFFFF", border: "1px solid #E2E8F0" }
                        }
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: active ? "#0F172A" : "#64748B" }}>{opt.label}</p>
                          <p className="text-xs" style={{ color: active ? "#1E3A8A" : "#64748B" }}>{opt.sub}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ background: active ? BRAND_BLUE : "#E2E8F0" }}>
                          {active && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B" }}>Language / dialect</label>
                <p className="text-xs mb-3" style={{ color: "#64748B" }}>How the AI responds and how ad copy sounds to your target market.</p>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(opt => {
                    const active = form.language === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm({ ...form, language: opt.value })}
                        className="p-3 rounded-xl text-left transition-all"
                        style={active
                          ? { background: "rgba(30,58,138,0.12)", border: `1px solid ${BRAND_BLUE}` }
                          : { background: "#FFFFFF", border: "1px solid #E2E8F0" }
                        }
                      >
                        <p className="text-xs font-semibold" style={{ color: active ? "#0F172A" : "#64748B" }}>{opt.label}</p>
                        <p className="text-xs" style={{ color: active ? "#1E3A8A" : "#64748B" }}>{opt.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>
          </div>
        </main>

        {/* Sticky bottom bar — sits above chat button (chat is bottom-6 right-6, ~80px) */}
        <div className="fixed bottom-0 left-0 right-0 md:left-60 md:right-24 px-6 py-3 flex items-center justify-between z-30" style={{ background: "rgba(248,250,252,0.95)", borderTop: "1px solid #E2E8F0", backdropFilter: "blur(12px)", borderRadius: "0 0 0 0" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "#64748B" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Your data is encrypted and used only for strategy generation.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearData}
              disabled={clearing}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#FFFFFF", border: "1px solid #EF444440", color: "#EF4444" }}
            >
              Clear Data
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#64748B" }}
            >
              Save Draft
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
              style={{ background: BRAND_BLUE, color: "#fff" }}
            >
              Generate Strategy
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </button>
          </div>
        </div>

      </div>

      <TutorialOverlay show={!setup?.businessName} />
    </div>
  );
}
