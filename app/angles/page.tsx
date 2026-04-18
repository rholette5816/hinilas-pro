"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

const ANGLE_COLORS: Record<string, string> = {
  Problem: "#EF4444",
  Solution: "#2B7EC9",
  Transformation: "#8B5CF6",
  Story: "#F5A623",
  Testimonial: "#10B981",
};

interface Angle {
  number: string;
  name: string;
  type: string;
  coreMessage: string;
  hookLine: string;
  formula: string;
  whyItWorks: string;
  uso: string;
  raw: string;
}

function parseAngles(output: string): Angle[] {
  const blocks = output.split(/(?=\*\*ANGLE\s+\d+)/i).filter(b => b.trim() && /\*\*ANGLE\s+\d+/i.test(b));
  return blocks.map(block => {
    const numberMatch = block.match(/\*\*ANGLE\s+(\d+)[:\s—-]+([^*\n(]+)/i);
    const typeMatch = block.match(/\(type:\s*([^)]+)\)/i);
    const coreMessage = block.match(/\*\*Core Message:\*\*\s*(.+)/i)?.[1]?.trim() || "";
    const hookLine = block.match(/\*\*Hook Line:\*\*\s*(.+)/i)?.[1]?.trim() || "";
    const formula = block.match(/\*\*Formula:\*\*\s*(.+)/i)?.[1]?.trim() || "";
    const whyItWorks = block.match(/\*\*Why It Works:\*\*\s*(.+)/i)?.[1]?.trim() || "";
    const uso = block.match(/\*\*Unique Selling Offer:\*\*\s*(.+)/i)?.[1]?.trim() || "";

    return {
      number: numberMatch?.[1] || "",
      name: numberMatch?.[2]?.trim().replace(/[*:]/g, "").trim() || "Angle",
      type: typeMatch?.[1]?.trim() || "Problem",
      coreMessage,
      hookLine,
      formula,
      whyItWorks,
      uso,
      raw: block,
    };
  });
}

export default function AnglesPage() {
  const { setup, researchOutput, anglesOutput, setAnglesOutput, setSelectedAngle, credits, refreshCredits } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [adjustNote, setAdjustNote] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [noCredits, setNoCredits] = useState(false);

  const angles = anglesOutput ? parseAngles(anglesOutput).filter(a => a.number && a.coreMessage) : [];

  async function generateAngles(adjustment?: string) {
    if (!setup) return;
    if (credits < 1) { setNoCredits(true); return; }
    setLoading(true);
    setShowAdjust(false);
    setSelectedCard(null);

    // Deduct 1 credit
    const deduct = await fetch("/api/credits/use", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: 1, description: "Angles generation" }) });
    if (!deduct.ok) { setNoCredits(true); setLoading(false); return; }
    await refreshCredits();

    const userCtx = buildUserContext(setup);
    let prompt = MODULE_PROMPTS.angles(userCtx, researchOutput, setup.language);
    if (adjustment?.trim()) {
      prompt += `\n\n# ADJUSTMENT REQUEST\nThe user was not satisfied with the previous angles. Their direction: "${adjustment.trim()}"\nGenerate 5 new angles based on this feedback.`;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
      });
      const data = await res.json();
      setAnglesOutput(data.error ? data.error : data.content);
    } catch {
      setAnglesOutput("Something went wrong. Try again.");
    } finally {
      setLoading(false);
      setAdjustNote("");
    }
  }

  function selectAngle(angle: Angle, idx: number) {
    setSelectedCard(idx);
    const formatted = `ANGLE ${angle.number}: ${angle.name} (${angle.type})\n\nCore Message: ${angle.coreMessage}\nHook: ${angle.hookLine}\nFormula: ${angle.formula}\nUSO: ${angle.uso}`;
    setSelectedAngle(formatted);
    setTimeout(() => router.push("/creative"), 300);
  }

  if (!setup) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Set up your business profile first.</p>
            <button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">Go to Setup</button>
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
            <p className="text-gray-400 text-sm mb-6">Angles costs 1 credit. Top up to continue.</p>
            <div className="flex flex-col gap-3">
              <a href="/pricing" className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center" style={{ background: "#F5A623" }}>View Plans</a>
              <button onClick={() => setNoCredits(false)} className="text-gray-500 text-sm hover:text-gray-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-orange-950 border border-orange-800 rounded-full px-3 py-1 mb-4">
              <span className="text-orange-300 text-xs font-medium">🎯 Strategy Department</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Find Winning Marketing Angles</h1>
            <p className="text-gray-400 text-sm">Your angle is the reason people buy. Pick one and go straight to Creative Department.</p>
          </div>

          {/* Research indicator */}
          {researchOutput && (
            <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5 mb-5 text-sm">
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-300">Research loaded — angles will be based on your customer insights</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => generateAngles()}
              disabled={loading}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#2B7EC9", color: "#fff", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
            >
              {loading ? "Generating..." : angles.length > 0 ? "Regenerate Angles — 1 credit" : "Generate Angles — 1 credit"}
            </button>

            {angles.length > 0 && !loading && (
              <button
                onClick={() => setShowAdjust(!showAdjust)}
                className="px-4 py-3 rounded-lg text-sm font-medium border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                {showAdjust ? "Cancel" : "Not happy with these?"}
              </button>
            )}
          </div>

          {/* Adjust panel */}
          {showAdjust && (
            <div className="rounded-xl border border-gray-700 p-4 mb-6" style={{ background: "#0F172A" }}>
              <p className="text-sm font-medium text-white mb-2">Tell me what to change</p>
              <p className="text-gray-500 text-xs mb-3">e.g. &quot;More aggressive tone&quot;, &quot;Focus on testimonial&quot;, &quot;Target moms aged 25&ndash;35&quot;</p>
              <textarea
                rows={2}
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Your direction..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-3"
              />
              <button
                onClick={() => generateAngles(adjustNote)}
                disabled={!adjustNote.trim() || loading}
                className="text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "#F5A623", color: "#000" }}
              >
                Regenerate with Adjustment — 1 credit
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="rounded-xl border border-gray-700 p-6" style={{ background: "#0F172A" }}>
              <div className="flex items-center gap-3 text-gray-400">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm">Finding winning angles...</span>
              </div>
            </div>
          )}

          {/* Angle cards */}
          {!loading && angles.length > 0 && (
            <div className="space-y-4">
              {angles.map((angle, idx) => {
                const color = ANGLE_COLORS[angle.type] || "#F5A623";
                const isSelected = selectedCard === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border overflow-hidden transition-all"
                    style={{
                      background: "#0F172A",
                      borderColor: isSelected ? color : "#374151",
                      boxShadow: isSelected ? `0 0 16px ${color}30` : "none",
                    }}
                  >
                    {/* Card header */}
                    <div className="px-5 py-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + "20" }}>
                          <span className="text-xs font-bold" style={{ color }}>{angle.number}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-bold text-sm">{angle.name}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color + "20", color }}>
                              {angle.type}
                            </span>
                            {angle.formula && (
                              <span className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-500">
                                {angle.formula}
                              </span>
                            )}
                          </div>
                          {angle.coreMessage && (
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">{angle.coreMessage}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => selectAngle(angle, idx)}
                        className="shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90"
                        style={{ background: color, color: "#000", boxShadow: `0 0 12px ${color}50, 0 0 24px ${color}25` }}
                      >
                        {isSelected ? "Going..." : "Use This →"}
                      </button>
                    </div>

                    {/* Hook line */}
                    {angle.hookLine && (
                      <div className="mx-5 mb-4 rounded-lg px-4 py-3 border" style={{ background: "#0A0F1A", borderColor: color + "30" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color }}>Hook Line</p>
                        <p className="text-gray-300 text-sm italic">&quot;{angle.hookLine}&quot;</p>
                      </div>
                    )}

                    {/* USO + Why it works */}
                    {(angle.uso || angle.whyItWorks) && (
                      <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {angle.uso && (
                          <div className="rounded-lg px-3 py-2.5" style={{ background: "#0A0F1A" }}>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Unique Selling Offer</p>
                            <p className="text-gray-300 text-xs leading-relaxed">{angle.uso}</p>
                          </div>
                        )}
                        {angle.whyItWorks && (
                          <div className="rounded-lg px-3 py-2.5" style={{ background: "#0A0F1A" }}>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Why It Works</p>
                            <p className="text-gray-300 text-xs leading-relaxed">{angle.whyItWorks}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
