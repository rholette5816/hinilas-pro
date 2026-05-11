"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import AILoadingState from "@/components/AILoadingState";
import FunnelProgress from "@/components/FunnelProgress";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function ResearchPage() {
  const { setup, researchOutput, setResearchOutput, credits, refreshCredits } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [noCredits, setNoCredits] = useState(false);

  async function runResearch() {
    if (!setup) return;
    if (credits < 1) {
      setNoCredits(true);
      return;
    }

    setLoading(true);
    setResearchOutput("");

    // Deduct 1 credit
    const deduct = await fetch("/api/credits/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1, description: "Research generation" }),
    });
    if (!deduct.ok) {
      setNoCredits(true);
      setLoading(false);
      return;
    }
    await refreshCredits();

    const userCtx = buildUserContext(setup);
    const prompt = MODULE_PROMPTS.research(userCtx, setup.language);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE, module: "research" }),
      });
      const data = await res.json();
      setResearchOutput(data.error ? data.error : data.content);
    } catch {
      setResearchOutput("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!setup) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Set up your business profile first.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              Go to Setup
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {noCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div
              className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-lg"
              style={{ border: "1px solid rgba(217,119,6,0.4)", color: "#D97706" }}
            >
              !
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Not enough credits</h2>
            <p className="text-gray-400 text-sm mb-6">Research costs 1 credit. Top up to continue.</p>
            <div className="flex flex-col gap-3">
              <a
                href="/pricing"
                className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center"
                style={{ background: "#D97706" }}
              >
                View Plans
              </a>
              <button onClick={() => setNoCredits(false)} className="text-gray-500 text-sm hover:text-gray-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <FunnelProgress currentStep={2} />

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-950 border border-emerald-800 rounded-full px-3 py-1 mb-4">
              <span className="text-emerald-300 text-xs font-medium">Research Department</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">AI Market Research</h1>
            <p className="text-gray-400 text-sm">
              Understand your market before you run a single ad. This research powers your strategy and copy.
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Researching for</p>
            <p className="text-white font-semibold">{setup.businessName}</p>
            <p className="text-gray-400 text-sm mt-1">{setup.product}</p>
            <p className="text-gray-500 text-xs mt-1">Target: {setup.targetAudience}</p>
          </div>

          {!researchOutput && (
            <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <h2 className="text-white font-semibold text-sm mb-3">What you&apos;ll get</h2>
              <div className="space-y-2">
                {[
                  "Who your customer really is",
                  "What stops them from buying",
                  "What competitors are missing",
                  "What makes people buy now",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckIcon className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                    <p className="text-xs text-gray-400">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={runResearch}
              disabled={loading}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#1E3A8A", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
            >
              {loading ? "Researching..." : researchOutput ? "Re-run Research - 1 credit" : "Run Market Research - 1 credit"}
            </button>
          </div>

          {loading ? (
            <AILoadingState
              messages={[
                "🔍 Diving into your market...",
                "Studying your competitors and what they're missing...",
                "Mapping your customer's pain points...",
                "Spotting buying triggers in your niche...",
                "Almost there. Polishing the insights...",
              ]}
              estimatedTime="This usually takes 2-3 minutes. Good research can't be rushed."
              icon="🔍"
            />
          ) : (
            <AIOutput content={researchOutput} />
          )}

          {researchOutput && !loading && (
            <div
              className="rounded-2xl p-6 mt-6"
              style={{ background: "rgba(30,58,138,0.08)", border: "1px solid rgba(30,58,138,0.3)" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "rgba(30,58,138,0.18)", color: "#1E3A8A" }}
                >
                  <CheckIcon />
                </div>
                <p className="text-white font-semibold text-sm">Step 2 done - Now let&apos;s find your angle</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">Use these insights to craft angles that convert.</p>
              <button
                onClick={() => router.push("/angles")}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: "#D97706", color: "#000000", animation: "btnGlowOrange 2s ease-in-out infinite alternate" }}
              >
                Next: Find Your Angle &rarr;
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
