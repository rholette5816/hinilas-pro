"use client";

import { HinilasIcon } from "@/components/HinilasLogo";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Feedback {
  id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  message: string;
}

const STEPS = [
  { num: "01", label: "Research", icon: "🔍", desc: "Deep market intelligence — understand your buyers, competitors, and market gaps before spending a single cent.", color: "#2B7EC9" },
  { num: "02", label: "Strategize", icon: "🎯", desc: "AI-generated angles and hooks built around your unique offer and target audience.", color: "#F5A623" },
  { num: "03", label: "Generate", icon: "⚡", desc: "High-converting ad copy and creatives in seconds — not hours.", color: "#8B5CF6" },
  { num: "04", label: "Launch", icon: "🚀", desc: "Campaign-ready assets structured for Meta Ads. Set up and go live with confidence.", color: "#10B981" },
];

const FEATURES = [
  { icon: "📊", title: "Market Research", desc: "Competitor analysis, buyer psychology, market gaps — all automated." },
  { icon: "🧠", title: "Ad Angle Builder", desc: "Multiple proven angles tailored to your product and audience." },
  { icon: "✍️", title: "Copy Generator", desc: "Primary text, headlines, CTAs — ready to paste into Ads Manager." },
  { icon: "🎨", title: "Creative Studio", desc: "AI-generated ad images and variations at the click of a button." },
  { icon: "📋", title: "Campaign Setup Guide", desc: "Step-by-step Messenger and conversion campaign setup." },
  { icon: "💬", title: "AI Chat Assistant", desc: "Ask anything about your ads, strategy, or product positioning." },
];

const FAQS = [
  {
    q: "How does Hinilas Pro work?",
    a: "You fill in your business profile, and the AI takes it from there. It runs market research, builds marketing angles, generates ad creatives, and writes sales copy — a complete campaign workflow in one session. No jumping between tools.",
  },
  {
    q: "Who is Hinilas Pro for?",
    a: "Beginners and operators who want a structured, guided process for running Meta Ads — without the guesswork. If you want to learn faster, execute smarter, and stop wasting ad spend, this tool is built for you.",
  },
  {
    q: "Who is Hinilas Pro NOT for?",
    a: "People looking for a magic button with zero effort. Hinilas Pro is a learning tool that amplifies your thinking — you still need to show up, follow the process, and apply what the AI gives you.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {FAQS.map((faq, i) => (
        <div
          key={i}
          className="rounded-2xl border overflow-hidden transition-all"
          style={{ background: "#0A0F1A", borderColor: open === i ? "#2B7EC9" : "#1E2D45" }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <span className="text-white font-semibold text-sm pr-4">{faq.q}</span>
            <span className="shrink-0 text-gray-500 transition-transform" style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)", fontSize: 20, lineHeight: 1 }}>+</span>
          </button>
          {open === i && (
            <div className="px-6 pb-5">
              <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const LOGIN_MESSAGES = [
  "Cooking your workspace...",
  "Firing up the AI engine...",
  "Preparing your ad arsenal...",
  "Loading market intelligence...",
  "Almost ready, Sir...",
];

function LoginModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % LOGIN_MESSAGES.length);
    }, 900);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(7, 11, 20, 0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >

      {/* Modal card */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "rgba(15, 23, 42, 0.92)",
          border: "1px solid rgba(43,126,201,0.3)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 80px rgba(43,126,201,0.2), 0 0 0 1px rgba(43,126,201,0.1)",
          animation: "modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:text-white transition-colors"
          style={{ background: "#1E2D45" }}
        >
          ✕
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-7">
          <HinilasIcon size="md" accentColor="#F5A623" />
          <div className="leading-tight">
            <div className="flex items-baseline">
              <span className="text-white font-bold text-lg">Hinilas</span>
              <span className="font-bold text-lg" style={{ color: "#F5A623" }}>Pro</span>
            </div>
            <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#2B7EC9" }}>AI Driven. Results Focused.</p>
          </div>
        </div>

        <h2 className="text-white text-xl font-bold mb-1">Get Started Free</h2>
        <p className="text-sm mb-7" style={{ color: "#64748B" }}>
          Sign in to access your AI marketing workspace.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: "#2B7EC9", color: "#fff" }}
        >
          {loading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.8 23.8 0 0 0 .5 24c0 3.9.9 7.5 2.7 10.7l7.5-6.1z"/>
              <path fill="#34A853" d="M24 47c5.5 0 10.2-1.8 13.6-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.2 1.9-6.3 0-11.6-4.2-13.5-9.9l-7.5 6.1C7 42.3 14.8 47 24 47z"/>
            </svg>
          )}
          <span key={msgIndex} style={{ animation: loading ? "fadeUp 0.4s ease forwards" : "none" }}>
            {loading ? LOGIN_MESSAGES[msgIndex] : "Continue with Google"}
          </span>
          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </button>

        <div
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-medium mt-3 cursor-not-allowed opacity-30"
          style={{ background: "#1E2D45", border: "1px solid #2B3D55", color: "#E2E8F0" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#E2E8F0">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Facebook Login — Coming Soon
        </div>

        <div className="flex items-center justify-center gap-5 mt-6 text-xs" style={{ color: "#334155" }}>
          <div className="flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            SSL Encrypted
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Free to start
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            No spam
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/feedback")
      .then(r => r.json())
      .then(d => setFeedbacks(d.feedbacks || []));
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : "5.0";

  return (
    <div className="min-h-screen relative" style={{ background: "#0B1120", color: "#fff" }}>

      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: translateY(32px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        .fade-up-d1 { animation: fadeUp 0.6s ease 0.15s forwards; opacity: 0; }
        .fade-up-d2 { animation: fadeUp 0.6s ease 0.3s forwards; opacity: 0; }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 16px 2px rgba(245,166,35,0.5), 0 0 32px 4px rgba(245,166,35,0.2); } 50% { box-shadow: 0 0 28px 6px rgba(245,166,35,0.7), 0 0 56px 10px rgba(245,166,35,0.3); } }
        @keyframes glowPulseBlue { 0%, 100% { box-shadow: 0 0 16px 2px rgba(43,126,201,0.5), 0 0 32px 4px rgba(43,126,201,0.2); } 50% { box-shadow: 0 0 28px 6px rgba(43,126,201,0.7), 0 0 56px 10px rgba(43,126,201,0.3); } }
        .cta-btn {
          position: relative;
          overflow: hidden;
          animation: glowPulse 2.5s ease-in-out infinite;
        }
        .cta-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.35) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: shimmer 2.2s linear infinite;
          border-radius: inherit;
          pointer-events: none;
        }
      `}</style>

      {/* Background — static dot grid only */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #1E3A5F 1px, transparent 1px)", backgroundSize: "36px 36px", opacity: 0.4 }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* NAV */}
        <nav style={{ borderBottom: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HinilasIcon size="md" accentColor="#F5A623" />
              <div className="leading-tight">
                <div className="flex items-baseline">
                  <span className="text-white font-bold text-lg">Hinilas</span>
                  <span className="font-bold text-lg" style={{ color: "#F5A623" }}>Pro</span>
                </div>
                <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "#2B7EC9" }}>AI Driven. Results Focused.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={openModal} className="text-sm font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 whitespace-nowrap" style={{ color: "#94A3B8" }}>
                Sign In
              </button>
              <button onClick={openModal} className="cta-btn text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:brightness-110 whitespace-nowrap" style={{ background: "#2B7EC9", color: "#fff", animationName: "glowPulseBlue" }}>
                Get Started Free
              </button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 fade-up">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 text-xs font-semibold" style={{ background: "rgba(43,126,201,0.15)", border: "1px solid rgba(43,126,201,0.3)", color: "#2B7EC9" }}>
              ⚡ AI-Powered Marketing System
            </div>
            <h1 className="font-black leading-tight mb-5" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)" }}>
              Stop Running Ads<br />
              <span style={{ color: "#F5A623" }}>Blindly.</span>
            </h1>
            <p className="text-lg mb-8" style={{ color: "#94A3B8", lineHeight: 1.7, maxWidth: 520 }}>
              The complete marketing intelligence platform. Research your market, build your strategy, generate your assets, and launch — all in one place.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={openModal}
                className="cta-btn px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                style={{ background: "#F5A623", color: "#000" }}
              >
                Get Started Free →
              </button>
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1E2D45", color: "#94A3B8" }}
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* App mockup */}
          <div className="flex-1 fade-up-d1 flex justify-center">
            <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ border: "1px solid #1E2D45", background: "rgba(15,23,42,0.8)", backdropFilter: "blur(20px)", boxShadow: "0 0 80px rgba(43,126,201,0.15)" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #1E2D45" }}>
                <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
                <span className="text-xs ml-2" style={{ color: "#475569" }}>hinilas.pro</span>
              </div>
              <div className="p-6 space-y-3">
                {["Market Research", "Ad Angles", "Copy Generation", "Creative Studio"].map((item, i) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: i === 1 ? "rgba(43,126,201,0.15)" : "#0F172A", border: `1px solid ${i === 1 ? "#2B7EC940" : "#1E2D45"}` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: ["#2B7EC9", "#F5A623", "#8B5CF6", "#10B981"][i] }} />
                    <span className="text-sm font-medium" style={{ color: i === 1 ? "#fff" : "#64748B" }}>{item}</span>
                    {i === 1 && <span className="ml-auto text-xs font-bold" style={{ color: "#F5A623" }}>Active</span>}
                    {i < 1 && <span className="ml-auto text-xs" style={{ color: "#10B981" }}>✓ Done</span>}
                  </div>
                ))}
                <div className="rounded-xl p-4 mt-2" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "#F5A623" }}>AI Generated Angle</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>&quot;Most sellers run ads and hope. You&apos;ll know exactly why your customer buys — before the first peso is spent.&quot;</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section style={{ borderTop: "1px solid #1E2D45", borderBottom: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: avgRating, suffix: "/5 ★", label: "Average Rating" },
              { value: "4", suffix: " Steps", label: "Core Modules" },
              { value: "30", suffix: " Credits", label: "Free on Signup" },
              { value: "∞", suffix: "", label: "Unlimited Text Generation" },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-3xl font-black mb-1" style={{ color: "#F5A623" }}>
                  {stat.value}<span className="text-lg font-bold" style={{ color: "#94A3B8" }}>{stat.suffix}</span>
                </div>
                <p className="text-xs font-medium" style={{ color: "#64748B" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#2B7EC9" }}>The System</p>
            <h2 className="text-3xl font-black mb-3">Marketing Intelligence Flow</h2>
            <p className="text-base" style={{ color: "#64748B" }}>A structured process — not random content. Every step feeds the next.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="rounded-2xl p-6 h-full" style={{ background: "rgba(15,23,42,0.8)", border: `1px solid ${step.color}30`, backdropFilter: "blur(8px)" }}>
                  <div className="text-2xl mb-3">{step.icon}</div>
                  <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: step.color }}>{step.num}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{step.label}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10 w-6 h-6 rounded-full items-center justify-center text-xs" style={{ background: "#0B1120", color: "#334155", border: "1px solid #1E2D45" }}>→</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ borderTop: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#F5A623" }}>Everything You Need</p>
              <h2 className="text-3xl font-black mb-3">Built for Serious Marketers</h2>
              <p className="text-base" style={{ color: "#64748B" }}>Every tool you need to go from idea to running campaign — in one platform.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(f => (
                <div key={f.title} className="rounded-xl p-5" style={{ background: "rgba(15,23,42,0.7)", border: "1px solid #1E2D45", backdropFilter: "blur(8px)" }}>
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <h3 className="text-white font-bold text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        {feedbacks.length > 0 && (
          <section style={{ borderTop: "1px solid #1E2D45" }}>
            <div className="max-w-6xl mx-auto px-6 py-20">
              <div className="text-center mb-12">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#10B981" }}>Real Results</p>
                <h2 className="text-3xl font-black mb-2">What Marketers Are Saying</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-amber-400">{"★".repeat(5)}</span>
                  <span className="text-white font-bold">{avgRating}/5</span>
                  <span style={{ color: "#475569" }}>from {feedbacks.length}+ users</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedbacks.slice(0, 6).map(f => (
                  <div key={f.id} className="rounded-xl p-5" style={{ background: "rgba(15,23,42,0.7)", border: "1px solid #1E2D45", backdropFilter: "blur(8px)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      {f.user_avatar ? (
                        <img src={f.user_avatar} alt={f.user_name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "#2B7EC9" }}>
                          {f.user_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-semibold">{f.user_name}</p>
                        <span className="text-amber-400 text-xs">{"★".repeat(f.rating)}</span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed italic" style={{ color: "#94A3B8" }}>
                      &quot;{f.message.length > 150 ? f.message.slice(0, 150) + "..." : f.message}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section style={{ borderTop: "1px solid #1E2D45" }}>
          <div className="max-w-3xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#2B7EC9" }}>FAQ</p>
              <h2 className="font-black text-white" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>Common Questions</h2>
            </div>
            <FAQSection />
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ borderTop: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-24 text-center">
            <div className="rounded-3xl px-8 py-16 mx-auto max-w-3xl" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid #1E2D45", backdropFilter: "blur(20px)", boxShadow: "0 0 80px rgba(43,126,201,0.1)" }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#2B7EC9" }}>Start Today</p>
              <h2 className="font-black mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                Ready to Level Up<br />
                <span style={{ color: "#F5A623" }}>Your Marketing?</span>
              </h2>
              <p className="text-base mb-8 mx-auto max-w-lg" style={{ color: "#64748B" }}>
                Research, strategize, generate, and launch — all in one platform. Built for marketers who want results, not guesswork.
              </p>
              <button
                onClick={openModal}
                className="cta-btn px-10 py-4 rounded-xl text-base font-bold transition-all hover:brightness-110"
                style={{ background: "#F5A623", color: "#000" }}
              >
                Get Started Free →
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HinilasIcon size="sm" accentColor="#F5A623" />
              <span className="text-sm font-bold text-white">HinilasPro</span>
            </div>
            <div className="flex items-center gap-6 text-xs" style={{ color: "#475569" }}>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <span>© 2025 Hinilas Pro</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Login Modal */}
      {showModal && <LoginModal onClose={closeModal} />}
    </div>
  );
}
