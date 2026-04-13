"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

export default function ResearchPage() {
  const { setup, researchOutput, setResearchOutput, credits, refreshCredits } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [noCredits, setNoCredits] = useState(false);

  async function runResearch() {
    if (!setup) return;
    if (credits < 1) { setNoCredits(true); return; }
    setLoading(true);
    setResearchOutput("");

    // Deduct 1 credit
    const deduct = await fetch("/api/credits/use", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: 1, description: "Research generation" }) });
    if (!deduct.ok) { setNoCredits(true); setLoading(false); return; }
    await refreshCredits();

    const userCtx = buildUserContext(setup);
    const prompt = MODULE_PROMPTS.research(userCtx);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
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
            <button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
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
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-white font-bold text-lg mb-2">Not enough credits</h2>
            <p className="text-gray-400 text-sm mb-6">Research costs 1 credit. Top up to continue.</p>
            <div className="flex flex-col gap-3">
              <a href="/pricing" className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center" style={{ background: "#F5A623" }}>View Plans</a>
              <button onClick={() => setNoCredits(false)} className="text-gray-500 text-sm hover:text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-950 border border-emerald-800 rounded-full px-3 py-1 mb-4">
              <span className="text-emerald-300 text-xs font-medium">🔍 Research</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">AI Market Research</h1>
            <p className="text-gray-400 text-sm">Know your customer before you run a single ad. This research powers your angles and copy.</p>
          </div>

          {/* Business summary */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Researching for</p>
            <p className="text-white font-semibold">{setup.businessName}</p>
            <p className="text-gray-400 text-sm mt-1">{setup.product}</p>
            <p className="text-gray-500 text-xs mt-1">Target: {setup.targetAudience}</p>
          </div>

          {/* Action */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={runResearch}
              disabled={loading}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40" style={{ background: "#2B7EC9" }}
            >
              {loading ? "Researching..." : researchOutput ? "Re-run Research" : "Run Market Research"}
              {!loading && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>1 cr</span>}
            </button>
            {researchOutput && !loading && (
              <button
                onClick={() => router.push("/angles")}
                className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: "#F5A623" }}
              >
                Next: Find Angles →
              </button>
            )}
          </div>

          {/* Output */}
          <AIOutput content={researchOutput} loading={loading} loadingText="Analyzing your market..." />
        </div>
      </main>
    </div>
  );
}
