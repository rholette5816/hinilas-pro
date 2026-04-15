"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    message: "Welcome to Hinilas Pro! I'll walk you through your first campaign in 6 simple steps. This tool is designed to guide you — just follow the process.",
  },
  {
    message: "Step 1 — Setup. Fill in your business profile. Your product, audience, and offer. The AI uses this for everything that follows.",
    highlight: "Setup",
  },
  {
    message: "Step 2 — Research. The AI analyzes your market, your buyers, and your competition. No more guessing who you're talking to.",
    highlight: "Research",
  },
  {
    message: "Step 3 — Angles. Get 5 proven marketing angles with hooks built around your product. Pick the one that fits best.",
    highlight: "Angles",
  },
  {
    message: "Step 4 — Creative. Generate ad images based on your chosen angle. Ready to upload straight to Ads Manager.",
    highlight: "Creative",
  },
  {
    message: "Step 5 — Sales Copy. AI writes your primary text, headlines, and CTAs. Then you're ready to launch. Let's begin.",
    highlight: "Sales Copy",
    cta: true,
  },
];

const STORAGE_KEY = "hinilas_tutorial_done";

interface Props {
  show: boolean;
}

export default function TutorialOverlay({ show }: Props) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      localStorage.removeItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(0);
       
      setVisible(true);
    } else {
       
      setVisible(false);
    }
  }, [show]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    if (current < STEPS.length - 1) {
      setCurrent(c => c + 1);
    }
  }

  function goSetup() {
    dismiss();
    // Scroll to top and focus first input on setup page
    window.scrollTo({ top: 0 });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("input[name='businessName'], input[placeholder*='business'], input");
      if (input) input.focus();
    }, 100);
  }

  if (!visible) return null;

  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <style>{`
        @keyframes tutOrb1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(40px,30px) scale(1.1); } }
        @keyframes tutOrb2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-30px,-20px) scale(1.08); } }
        @keyframes tutOrb3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(20px,-30px) scale(1.06); } }
        @keyframes tutFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Backdrop with blur + orbs */}
      <div className="absolute inset-0 overflow-hidden" style={{ background: "rgba(11,17,32,0.85)", backdropFilter: "blur(10px)" }}>
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(100px)", opacity: 0.25, width: 500, height: 500, background: "#2B7EC9", top: -100, left: -100, animation: "tutOrb1 14s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(100px)", opacity: 0.18, width: 400, height: 400, background: "#F5A623", bottom: -80, right: -80, animation: "tutOrb2 11s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(120px)", opacity: 0.14, width: 350, height: 350, background: "#8B5CF6", top: "50%", left: "50%", animation: "tutOrb3 16s ease-in-out infinite alternate" }} />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#0F172A", border: "1px solid #2B7EC9", boxShadow: "0 0 60px rgba(43,126,201,0.3)", animation: "tutFadeIn 0.3s ease-out forwards" }}
      >
        {/* Header — correct logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1E2D45" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(43,126,201,0.15)", border: "1px solid rgba(43,126,201,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#2B7EC9" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline">
                <span className="text-white font-bold text-sm">Hinilas</span>
                <span className="font-bold text-sm" style={{ color: "#2B7EC9" }}>Pro</span>
              </div>
              <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#2B7EC9" }}>Quick Start Guide</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-500 hover:text-white text-base leading-none transition-colors">✕</button>
        </div>

        {/* Step counter */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#334155" }}>
            {current + 1} of {STEPS.length}
          </span>
        </div>

        {/* Message */}
        <div className="px-5 py-3">
          <p className="text-sm leading-relaxed" style={{ color: "#CBD5E1" }}>
            {step.message}
          </p>
          {step.highlight && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(43,126,201,0.15)", color: "#2B7EC9", border: "1px solid rgba(43,126,201,0.3)" }}>
              → {step.highlight}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  background: i === current ? "#2B7EC9" : i < current ? "#1E3A5F" : "#1E2D45",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button onClick={dismiss} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Skip
            </button>
            {isLast ? (
              <button
                onClick={goSetup}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110"
                style={{ background: "#2B7EC9", boxShadow: "0 0 16px rgba(43,126,201,0.4)" }}
              >
                Start Setup →
              </button>
            ) : (
              <button
                onClick={next}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#2B7EC9" }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
