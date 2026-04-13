"use client";

import { createClient } from "@/lib/supabase/client";
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
    label: "Research",
    icon: "🔍",
    desc: "Understand your market, competitors, and buyer psychology",
    color: "#2B7EC9",
  },
  {
    label: "Strategize",
    icon: "🎯",
    desc: "Build angles and hooks that resonate with your audience",
    color: "#F5A623",
  },
  {
    label: "Generate",
    icon: "⚡",
    desc: "AI-powered copy and creatives ready in seconds",
    color: "#8B5CF6",
  },
  {
    label: "Launch",
    icon: "🚀",
    desc: "Campaign-ready assets built for conversion",
    color: "#10B981",
  },
];

export default function LoginPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/feedback")
      .then(r => r.json())
      .then(d => setFeedbacks(d.feedbacks || []));
  }, []);

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleFacebook() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0B1120" }}>

      {/* Animated orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, #1E2D45 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }} />
      </div>

      <style>{`
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          animation: drift 12s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: #2B7EC9;
          top: -100px; left: -100px;
          animation-duration: 14s;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: #F5A623;
          bottom: -80px; right: -80px;
          animation-duration: 10s;
          animation-delay: -4s;
        }
        .orb-3 {
          width: 300px; height: 300px;
          background: #8B5CF6;
          top: 40%; left: 50%;
          animation-duration: 16s;
          animation-delay: -8s;
        }
        @keyframes drift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.08); }
          100% { transform: translate(-20px, 50px) scale(0.95); }
        }
      `}</style>

      {/* Layout */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* LEFT — Value proposition */}
        <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-0 max-w-2xl">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <HinilasIcon size="lg" accentColor="#F5A623" />
            <div className="leading-tight">
              <div className="flex items-baseline">
                <span className="text-white font-bold text-xl tracking-wide">Hinilas</span>
                <span className="font-bold text-xl tracking-wide" style={{ color: "#F5A623" }}>Pro</span>
              </div>
              <p className="text-[10px] font-semibold tracking-widest uppercase leading-none mt-0.5">
                <span style={{ color: "#2B7EC9" }}>AI Driven. </span>
                <span style={{ color: "#F5A623" }}>Results Focused.</span>
              </p>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-white font-black text-4xl lg:text-5xl leading-tight mb-4">
            Stop Guessing.<br />
            <span style={{ color: "#F5A623" }}>Start Converting.</span>
          </h1>
          <p className="text-lg mb-10" style={{ color: "#94A3B8" }}>
            From market research to live ad — one platform, zero guesswork.
          </p>

          {/* 4-step framework */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: "#0F172A", border: `1px solid ${step.color}30` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: `${step.color}20` }}
                >
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: step.color }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-white text-xs font-bold">{step.label}</span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          {feedbacks.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                {/* Stacked avatars */}
                <div className="flex -space-x-2">
                  {feedbacks.slice(0, 4).map((f, i) => (
                    f.user_avatar ? (
                      <img
                        key={i}
                        src={f.user_avatar}
                        alt={f.user_name}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-[#0B1120]"
                      />
                    ) : (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2"
                        style={{ background: "#2B7EC9", outline: "2px solid #0B1120" }}
                      >
                        {f.user_name.charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                </div>
                <div>
                  {avgRating && (
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 text-xs">{"★".repeat(Math.round(Number(avgRating)))}</span>
                      <span className="text-white text-xs font-bold">{avgRating}</span>
                      <span className="text-gray-500 text-xs">/ 5</span>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs">{feedbacks.length}+ marketers already using this</p>
                </div>
              </div>

              {/* One featured testimonial */}
              {feedbacks[0] && (
                <div className="rounded-xl px-4 py-3" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
                  <p className="text-gray-400 text-xs leading-relaxed italic mb-2">"{feedbacks[0].message.length > 120 ? feedbacks[0].message.slice(0, 120) + "..." : feedbacks[0].message}"</p>
                  <div className="flex items-center gap-2">
                    {feedbacks[0].user_avatar ? (
                      <img src={feedbacks[0].user_avatar} alt={feedbacks[0].user_name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#2B7EC9" }}>
                        {feedbacks[0].user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white text-xs font-semibold">{feedbacks[0].user_name}</span>
                    <span className="text-amber-400 text-xs">{"★".repeat(feedbacks[0].rating)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Login card */}
        <div className="flex items-center justify-center px-6 py-12 lg:py-0 lg:w-[420px] lg:px-10">
          <div className="w-full max-w-sm">
            <div
              className="rounded-2xl p-8"
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid #1E2D45",
                backdropFilter: "blur(16px)",
                boxShadow: "0 0 40px rgba(43, 126, 201, 0.08)",
              }}
            >
              <h2 className="text-white text-xl font-bold mb-1">Get Started Free</h2>
              <p className="text-sm mb-2" style={{ color: "#94A3B8" }}>
                Sign in to access your AI ads workspace.
              </p>
              <p className="text-xs font-semibold mb-7" style={{ color: "#F5A623" }}>
                5 free credits on signup. No credit card required.
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#2B7EC9", color: "#fff" }}
              >
                {loading ? (
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                {loading ? "Redirecting..." : "Continue with Google"}
              </button>

              <div
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium mt-3 cursor-not-allowed opacity-35"
                style={{ background: "#1E2D45", border: "1px solid #2B3D55", color: "#E2E8F0" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#E2E8F0">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
                Facebook Login — Coming Soon
              </div>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "#1E2D45" }} />
                <span className="text-gray-600 text-xs">secure login</span>
                <div className="flex-1 h-px" style={{ background: "#1E2D45" }} />
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  SSL Encrypted
                </div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  No spam
                </div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Free to start
                </div>
              </div>
            </div>

            <p className="text-center text-xs mt-5" style={{ color: "#334155" }}>
              © 2025 Hinilas Pro — Basta Mag Ads Hilas
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
