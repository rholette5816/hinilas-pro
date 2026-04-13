"use client";

import { useRouter } from "next/navigation";
import { HinilasIcon } from "@/components/HinilasLogo";
import { useEffect, useState } from "react";

interface Feedback {
  id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  message: string;
}

const STEPS = [
  {
    num: "01",
    label: "Research",
    icon: "🔍",
    desc: "Deep market intelligence — understand your buyers, competitors, and market gaps before spending a single cent.",
    color: "#2B7EC9",
  },
  {
    num: "02",
    label: "Strategize",
    icon: "🎯",
    desc: "AI-generated angles and hooks built around your unique offer and target audience.",
    color: "#F5A623",
  },
  {
    num: "03",
    label: "Generate",
    icon: "⚡",
    desc: "High-converting ad copy and creatives in seconds — not hours.",
    color: "#8B5CF6",
  },
  {
    num: "04",
    label: "Launch",
    icon: "🚀",
    desc: "Campaign-ready assets structured for Meta Ads. Set up and go live with confidence.",
    color: "#10B981",
  },
];

const FEATURES = [
  { icon: "📊", title: "Market Research", desc: "Competitor analysis, buyer psychology, market gaps — all automated." },
  { icon: "🧠", title: "Ad Angle Builder", desc: "Multiple proven angles tailored to your product and audience." },
  { icon: "✍️", title: "Copy Generator", desc: "Primary text, headlines, CTAs — ready to paste into Ads Manager." },
  { icon: "🎨", title: "Creative Studio", desc: "AI-generated ad images and variations at the click of a button." },
  { icon: "📋", title: "Campaign Setup Guide", desc: "Step-by-step Messenger and conversion campaign setup." },
  { icon: "💬", title: "AI Chat Assistant", desc: "Ask anything about your ads, strategy, or product positioning." },
];

export default function LandingPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  useEffect(() => {
    fetch("/api/feedback")
      .then(r => r.json())
      .then(d => setFeedbacks(d.feedbacks || []));
  }, []);

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : "5.0";

  return (
    <div className="min-h-screen relative" style={{ background: "#0B1120", color: "#fff" }}>

      {/* Background effects */}
      <style>{`
        @keyframes orbDrift1 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,40px) scale(1.1); } 100% { transform: translate(-30px,70px) scale(0.95); } }
        @keyframes orbDrift2 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,-40px) scale(1.08); } 100% { transform: translate(40px,-60px) scale(0.92); } }
        @keyframes orbDrift3 { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-50px) scale(1.12); } 100% { transform: translate(-60px,30px) scale(0.96); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .fade-up-delay { animation: fadeUp 0.7s ease 0.2s forwards; opacity: 0; }
        .fade-up-delay2 { animation: fadeUp 0.7s ease 0.4s forwards; opacity: 0; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(120px)", opacity: 0.3, width: 700, height: 700, background: "#2B7EC9", top: -200, left: -200, animation: "orbDrift1 14s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(120px)", opacity: 0.2, width: 600, height: 600, background: "#F5A623", bottom: -150, right: -150, animation: "orbDrift2 10s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(140px)", opacity: 0.15, width: 500, height: 500, background: "#8B5CF6", top: "40%", left: "40%", animation: "orbDrift3 16s ease-in-out infinite alternate" }} />
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
              <button
                onClick={() => router.push("/login")}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: "#94A3B8" }}
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/login")}
                className="text-sm font-bold px-5 py-2 rounded-xl transition-all hover:brightness-110"
                style={{ background: "#2B7EC9", color: "#fff" }}
              >
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
            <p className="text-lg mb-4" style={{ color: "#94A3B8", lineHeight: 1.7, maxWidth: 520 }}>
              The complete marketing intelligence platform. Research your market, build your strategy, generate your assets, and launch — all in one place.
            </p>
            <p className="text-sm mb-8 font-semibold" style={{ color: "#F5A623" }}>
              5 free credits on signup. No credit card required.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => router.push("/login")}
                className="px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
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

          {/* App mockup / visual */}
          <div className="flex-1 fade-up-delay flex justify-center">
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
                  <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>"Most sellers run ads and hope. You'll know exactly why your customer buys — before the first peso is spent."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section style={{ borderTop: "1px solid #1E2D45", borderBottom: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: avgRating, label: "Average Rating", suffix: "/5 ★" },
              { value: "4", label: "Core Modules", suffix: " Steps" },
              { value: "5", label: "Free Credits", suffix: " on Signup" },
              { value: "∞", label: "Text Generation", suffix: " Unlimited" },
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
                <div
                  className="rounded-2xl p-6 h-full"
                  style={{ background: "rgba(15,23,42,0.8)", border: `1px solid ${step.color}30`, backdropFilter: "blur(8px)" }}
                >
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
                <div
                  key={f.title}
                  className="rounded-xl p-5"
                  style={{ background: "rgba(15,23,42,0.7)", border: "1px solid #1E2D45", backdropFilter: "blur(8px)" }}
                >
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
                <h2 className="text-3xl font-black mb-2">"Basta Mag Ads Hilas."</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-amber-400">{"★".repeat(5)}</span>
                  <span className="text-white font-bold">{avgRating}/5</span>
                  <span style={{ color: "#475569" }}>from {feedbacks.length}+ users</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedbacks.slice(0, 6).map(f => (
                  <div
                    key={f.id}
                    className="rounded-xl p-5"
                    style={{ background: "rgba(15,23,42,0.7)", border: "1px solid #1E2D45", backdropFilter: "blur(8px)" }}
                  >
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
                      "{f.message.length > 150 ? f.message.slice(0, 150) + "..." : f.message}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section style={{ borderTop: "1px solid #1E2D45" }}>
          <div className="max-w-6xl mx-auto px-6 py-24 text-center">
            <div
              className="rounded-3xl px-8 py-16 mx-auto max-w-3xl"
              style={{ background: "rgba(15,23,42,0.8)", border: "1px solid #1E2D45", backdropFilter: "blur(20px)", boxShadow: "0 0 80px rgba(43,126,201,0.1)" }}
            >
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#2B7EC9" }}>Start Today</p>
              <h2 className="font-black mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                Ready to Level Up<br />
                <span style={{ color: "#F5A623" }}>Your Marketing?</span>
              </h2>
              <p className="text-base mb-3 mx-auto max-w-lg" style={{ color: "#64748B" }}>
                Use Hinilas Pro to build a complete marketing system. Research, strategize, generate, and launch — all in one platform.
              </p>
              <p className="text-sm font-semibold mb-8" style={{ color: "#F5A623" }}>Free to start. No credit card required.</p>
              <button
                onClick={() => router.push("/login")}
                className="px-10 py-4 rounded-xl text-base font-bold transition-all hover:brightness-110"
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
              <a href="/login" className="hover:text-white transition-colors">Sign In</a>
              <span>© 2025 Hinilas Pro</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
