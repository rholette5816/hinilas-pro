"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useApp, UserSetup } from "@/lib/context";

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";


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
    <div className="flex h-screen overflow-hidden" style={{ background: "#0F172A" }}>
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
              <div className="flex-1 h-px max-w-[60px]" style={{ background: "#1E2D45" }} />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#1E2D45", color: "#475569" }}>2</div>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>Market Analysis</span>
              </div>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-black text-white mb-2">Business Intelligence Profile</h1>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Tell us about your business to power your AI-driven marketing engine. Our intelligence models use these details to craft high-conversion strategies.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Industry */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Industry</label>
                <p className="text-xs mb-3" style={{ color: "#64748B" }}>Helps the AI generate creatives that match your industry&apos;s visual style.</p>
                <select
                  value={form.industry || ""}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all appearance-none"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45", color: form.industry ? "#fff" : "#475569" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                >
                  <option value="" style={{ background: "#0F172A", color: "#475569" }}>Select your industry...</option>
                  {PH_INDUSTRIES.map(ind => (
                    <option key={ind.value} value={ind.value} style={{ background: "#0F172A", color: "#fff" }}>{ind.label}</option>
                  ))}
                </select>
              </div>

              {/* Business Name + Market */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Business / Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hinilas Pro"
                    value={form.businessName}
                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                    style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                    onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                    onBlur={e => e.target.style.borderColor = "#1E2D45"}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Market / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Global, North America"
                    value={form.market}
                    onChange={e => setForm({ ...form, market: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                    style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                    onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                    onBlur={e => e.target.style.borderColor = "#1E2D45"}
                  />
                </div>
              </div>

              {/* Product */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>What Are You Selling?</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe your main product or offering..."
                  value={form.product}
                  onChange={e => setForm({ ...form, product: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Who Is Your Target Customer?</label>
                <input
                  type="text"
                  required
                  placeholder="Define your ideal persona (e.g. Mid-level marketers in tech)..."
                  value={form.targetAudience}
                  onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                />
              </div>

              {/* USP */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold tracking-widest uppercase" style={{ color: "#475569" }}>Unique Selling Offer (USP)</label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(245,166,35,0.1)", color: BRAND_ORANGE, border: `1px solid ${BRAND_ORANGE}30` }}>AI Optimized</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="What makes you stand out from the competition?"
                  value={form.uniqueSellingOffer}
                  onChange={e => setForm({ ...form, uniqueSellingOffer: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                  onFocus={e => e.target.style.borderColor = BRAND_BLUE}
                  onBlur={e => e.target.style.borderColor = "#1E2D45"}
                />
                <p className="text-xs mt-1.5" style={{ color: "#64748B" }}>Include price, freebies, guarantee, urgency — anything that makes them act.</p>
              </div>

              {/* Stage */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#94A3B8" }}>Where Are You Now?</label>
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
                          ? { background: "rgba(43,126,201,0.12)", border: `1px solid ${BRAND_BLUE}` }
                          : { background: "#0F172A", border: "1px solid #1E2D45" }
                        }
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: active ? "#fff" : "#94A3B8" }}>{opt.label}</p>
                          <p className="text-xs" style={{ color: active ? "#64A4D8" : "#334155" }}>{opt.sub}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ background: active ? BRAND_BLUE : "#1E2D45" }}>
                          {active && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "#475569" }}>Language / Dialect</label>
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
                          ? { background: "rgba(43,126,201,0.12)", border: `1px solid ${BRAND_BLUE}` }
                          : { background: "#0F172A", border: "1px solid #1E2D45" }
                        }
                      >
                        <p className="text-xs font-semibold" style={{ color: active ? "#fff" : "#94A3B8" }}>{opt.label}</p>
                        <p className="text-[10px]" style={{ color: active ? "#64A4D8" : "#334155" }}>{opt.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>
          </div>
        </main>

        {/* Sticky bottom bar — sits above chat button (chat is bottom-6 right-6, ~80px) */}
        <div className="fixed bottom-0 left-0 right-0 md:left-60 md:right-24 px-6 py-3 flex items-center justify-between z-30" style={{ background: "rgba(15,23,42,0.95)", borderTop: "1px solid #1E2D45", backdropFilter: "blur(12px)", borderRadius: "0 0 0 0" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "#334155" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Your data is encrypted and used only for strategy generation.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearData}
              disabled={clearing}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#0F172A", border: "1px solid #EF444440", color: "#EF4444" }}
            >
              Clear Data
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#0F172A", border: "1px solid #1E2D45", color: "#94A3B8" }}
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
