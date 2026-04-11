"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

export default function CopyPage() {
  const { setup, selectedAngle, setSelectedAngle } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  async function generateCopy() {
    if (!setup || !selectedAngle.trim()) return;
    setLoading(true);
    setOutput("");

    const userCtx = buildUserContext(setup);
    const prompt = MODULE_PROMPTS.copy(userCtx, selectedAngle);

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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-950 border border-purple-800 rounded-full px-3 py-1 mb-4">
              <span className="text-purple-300 text-xs font-medium">✍ Copy</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Write High-Converting Ad Copy</h1>
            <p className="text-gray-400 text-sm">Your message is what makes people act. The right formula for your angle makes all the difference.</p>
          </div>

          {/* Angle input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Marketing Angle</label>
            <textarea
              rows={3}
              value={selectedAngle}
              onChange={e => setSelectedAngle(e.target.value)}
              placeholder="Paste or describe your angle here. e.g. Problem Angle — target women 25–35 struggling with acne who've tried many products with no results..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {!selectedAngle && (
              <p className="text-gray-500 text-xs mt-1.5">
                No angle selected.{" "}
                <button onClick={() => router.push("/angles")} className="text-blue-400 hover:text-blue-300 underline">Go to Angles</button>{" "}
                to generate one first.
              </p>
            )}
          </div>

          {/* Action */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={generateCopy}
              disabled={loading || !selectedAngle.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
            >
              {loading ? "Writing..." : output ? "Rewrite Copy" : "Generate Ad Copy"}
            </button>
            {output && !loading && (
              <button
                onClick={() => router.push("/creative")}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                Next: Generate Creatives →
              </button>
            )}
          </div>

          {/* Output */}
          <AIOutput content={output} loading={loading} loadingText="Writing your ad copy..." />

          {/* Copy tip */}
          {!output && !loading && (
            <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-5">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Which formula will be used?</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { angle: "Problem Angle", formula: "PAS", desc: "Problem → Agitate → Solution → CTA" },
                  { angle: "Story Angle", formula: "Story", desc: "Hook → Story → Lesson → CTA" },
                  { angle: "Transformation", formula: "BAB", desc: "Before → After → Bridge" },
                  { angle: "Educational", formula: "AIDA", desc: "Attention → Interest → Desire → Action" },
                ].map(f => (
                  <div key={f.formula} className="bg-gray-900 rounded-lg p-3">
                    <p className="text-white font-semibold">{f.formula}</p>
                    <p className="text-gray-500 text-xs">{f.angle}</p>
                    <p className="text-gray-600 text-xs mt-1">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
