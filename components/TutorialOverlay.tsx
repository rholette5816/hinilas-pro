"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HinilasIcon } from "@/components/HinilasLogo";

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
    message: "Step 5 — Sales Copy. AI writes your primary text, headlines, and CTAs. Then you're ready to launch. Let's start with your Setup.",
    highlight: "Sales Copy",
    cta: true,
  },
];

const STORAGE_KEY = "hinilas_tutorial_done";

interface Props {
  show: boolean;
}

export default function TutorialOverlay({ show }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show) {
      // Always show when setup is empty (covers first login + after clear data)
      localStorage.removeItem(STORAGE_KEY);
      setCurrent(0);
      setDismissed(false);
      setVisible(true);
    }
  }, [show]);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    if (current < STEPS.length - 1) {
      setCurrent(c => c + 1);
    }
  }

  function goSetup() {
    dismiss();
    router.push("/");
  }

  if (!visible) return null;

  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;

  return (
    <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full animate-slideUp">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>

      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#0F172A", border: "1px solid #2B7EC9", boxShadow: "0 0 40px rgba(43,126,201,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#1E2D45" }}>
          <div className="flex items-center gap-2">
            <HinilasIcon size="sm" accentColor="#2B7EC9" />
            <span className="text-white text-xs font-bold">Hinilas Guide</span>
          </div>
          <button onClick={dismiss} className="text-gray-500 hover:text-white text-sm leading-none">✕</button>
        </div>

        {/* Message */}
        <div className="px-4 py-4">
          <p className="text-sm leading-relaxed" style={{ color: "#CBD5E1" }}>
            {step.message}
          </p>
          {step.highlight && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(43,126,201,0.15)", color: "#2B7EC9", border: "1px solid rgba(43,126,201,0.3)" }}>
              → {step.highlight}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? 16 : 6,
                  height: 6,
                  background: i === current ? "#2B7EC9" : i < current ? "#1E3A5F" : "#1E2D45",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={dismiss}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Skip
            </button>
            {isLast ? (
              <button
                onClick={goSetup}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#2B7EC9" }}
              >
                Start Setup →
              </button>
            ) : (
              <button
                onClick={next}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
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
