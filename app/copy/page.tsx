"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

const FORMULAS = [
  { key: "PAS", label: "PAS", angle: "Problem Angle", desc: "Problem → Agitate → Solution → CTA" },
  { key: "BAB", label: "BAB", angle: "Transformation", desc: "Before → After → Bridge" },
  { key: "AIDA", label: "AIDA", angle: "Educational", desc: "Attention → Interest → Desire → Action" },
  { key: "Story", label: "Story", angle: "Story Angle", desc: "Hook → Story → Lesson → CTA" },
];

export default function CopyPage() {
  const { setup, selectedAngle, setSelectedAngle } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [selectedFormulas, setSelectedFormulas] = useState<string[]>([]);

  function toggleFormula(key: string) {
    setSelectedFormulas(prev => {
      if (prev.includes(key)) return prev.filter(f => f !== key);
      if (prev.length >= 2) return prev;
      return [...prev, key];
    });
  }

  async function generateCopy() {
    if (!setup || !selectedAngle.trim()) return;
    setLoading(true);
    setOutput("");

    const formulas = selectedFormulas.length > 0 ? selectedFormulas : ["PAS", "BAB"];
    const userCtx = buildUserContext(setup);
    const prompt = MODULE_PROMPTS.copy(userCtx, selectedAngle, formulas);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
      });
      const data = await res.json();
      setOutput(data.error ? `Error: ${data.error}` : data.content);
    } catch {
      setOutput("Something went wrong. Try again.");
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
            <button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium">Go to Setup</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-950 border border-purple-800 rounded-full px-3 py-1 mb-4">
              <span className="text-purple-300 text-xs font-medium">✍ Sales Copy</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Write Your Captions</h1>
            <p className="text-gray-400 text-sm">Pick up to 2 formulas. AI writes 2 variations with caption, headline, bold claim, and hook line.</p>
          </div>

          {/* Angle input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Marketing Angle</label>
            <textarea
              rows={3}
              value={selectedAngle}
              onChange={e => setSelectedAngle(e.target.value)}
              placeholder="Paste or describe your angle here. e.g. Problem Angle — target women 25–35 struggling with acne who've tried many products with no results..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            {!selectedAngle && (
              <p className="text-gray-500 text-xs mt-1.5">
                No angle selected.{" "}
                <button onClick={() => router.push("/angles")} className="text-blue-400 hover:text-blue-300 underline">Go to Angles</button>{" "}
                to generate one first.
              </p>
            )}
          </div>

          {/* Formula selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Choose Formulas</label>
              <span className="text-xs text-gray-500">{selectedFormulas.length}/2 selected</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FORMULAS.map(f => {
                const selected = selectedFormulas.includes(f.key);
                const disabled = !selected && selectedFormulas.length >= 2;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleFormula(f.key)}
                    disabled={disabled}
                    className="p-3 rounded-lg border text-left transition-all cursor-pointer"
                    style={
                      selected
                        ? { background: "#2B7EC9", borderColor: "#2B7EC9", color: "white" }
                        : disabled
                        ? { background: "#111827", borderColor: "#1F2937", color: "#4B5563", cursor: "not-allowed" }
                        : { background: "#1E293B", borderColor: "#374151", color: "#9CA3AF" }
                    }
                  >
                    <p className="text-sm font-bold">{f.label}</p>
                    <p className="text-xs opacity-80 mt-0.5">{f.angle}</p>
                    <p className="text-xs opacity-60 mt-0.5">{f.desc}</p>
                  </button>
                );
              })}
            </div>
            {selectedFormulas.length === 0 && (
              <p className="text-gray-600 text-xs mt-2">No selection defaults to PAS and BAB.</p>
            )}
          </div>

          {/* Action */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={generateCopy}
              disabled={loading || !selectedAngle.trim()}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#2B7EC9" }}
            >
              {loading ? "Writing..." : output ? "Rewrite Captions" : "Generate Captions"}
            </button>
            {output && !loading && (
              <button
                onClick={() => router.push("/analyze")}
                className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#F5A623" }}
              >
                Next: Analyze Results →
              </button>
            )}
          </div>

          {/* Output */}
          <AIOutput content={output} loading={loading} loadingText="Writing your captions..." />

        </div>
      </main>
    </div>
  );
}
