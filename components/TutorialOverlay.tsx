"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    title: "Welcome to Hinilas Pro!",
    message: "Sa loob ng 5 minuto, makakuha ka ng research, angles, at captions para sa iyong ads. Libre ang una mong kit.",
    highlight: null,
    cta: false,
  },
  {
    title: "Simulan natin.",
    message: "Fill in your business details below so Hinilas Pro can build your Ad Kit.",
    highlight: "Setup",
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

      <div className="absolute inset-0" style={{ background: "rgba(248,250,252,0.85)", backdropFilter: "blur(10px)" }} />

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 20px 60px rgba(15,23,42,0.16)", animation: "tutFadeIn 0.3s ease-out forwards" }}
      >
        {/* Header — correct logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#E2E8F0" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(30,58,138,0.15)", border: "1px solid rgba(30,58,138,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#1E3A8A" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline">
                <span className="text-slate-900 font-bold text-sm">Hinilas</span>
                <span className="font-bold text-sm" style={{ color: "#1E3A8A" }}>Pro</span>
              </div>
              <p className="text-xs font-semibold" style={{ color: "#1E3A8A" }}>Quick start guide</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-500 hover:text-slate-900 text-base leading-none transition-colors">✕</button>
        </div>

        {/* Step counter */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
            {current + 1} of {STEPS.length}
          </span>
        </div>

        {/* Message */}
        <div className="px-5 py-3">
          <h2 className="text-base font-bold mb-2" style={{ color: "#0F172A" }}>{step.title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#0F172A" }}>
            {step.message}
          </p>
          {step.highlight && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(30,58,138,0.15)", color: "#1E3A8A", border: "1px solid rgba(30,58,138,0.3)" }}>
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
                  background: i === current ? "#1E3A8A" : "#CBD5E1",
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
                style={{ background: "#1E3A8A", boxShadow: "0 0 16px rgba(30,58,138,0.4)" }}
              >
                Start Setup →
              </button>
            ) : (
              <button
                onClick={next}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#1E3A8A" }}
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
