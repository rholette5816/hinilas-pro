"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

export default function AnglesPage() {
  const { setup, researchOutput, anglesOutput, setAnglesOutput, setSelectedAngle } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customAngle, setCustomAngle] = useState("");

  async function generateAngles() {
    if (!setup) return;
    setLoading(true);
    setAnglesOutput("");

    const userCtx = buildUserContext(setup);
    const prompt = MODULE_PROMPTS.angles(userCtx, researchOutput);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
      });
      const data = await res.json();
      setAnglesOutput(data.error ? `Error: ${data.error}` : data.content);
    } catch {
      setAnglesOutput("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectAngle(angle: string) {
    setSelectedAngle(angle);
    router.push("/copy");
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
            <div className="inline-flex items-center gap-2 bg-orange-950 border border-orange-800 rounded-full px-3 py-1 mb-4">
              <span className="text-orange-300 text-xs font-medium">🎯 Angles</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Find Winning Marketing Angles</h1>
            <p className="text-gray-400 text-sm">Your angle is the reason people buy. Different angles = different results. Test 2–3 at a time.</p>
          </div>

          {/* Research context indicator */}
          {researchOutput && (
            <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5 mb-5 text-sm">
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-300">Research data loaded — angles will be based on your customer insights</span>
            </div>
          )}

          {/* Action */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={generateAngles}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
            >
              {loading ? "Generating..." : anglesOutput ? "Regenerate Angles" : "Generate Angles"}
            </button>
          </div>

          {/* Output */}
          <AIOutput content={anglesOutput} loading={loading} loadingText="Finding winning angles..." />

          {/* Select angle to use */}
          {anglesOutput && !loading && (
            <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-3">Pick an angle to write copy for</p>
              <p className="text-gray-400 text-xs mb-3">Paste the angle you want to use, or type it in your own words.</p>
              <textarea
                rows={3}
                value={customAngle}
                onChange={e => setCustomAngle(e.target.value)}
                placeholder="e.g. Problem Angle — Women who struggle with dark spots and have tried everything but nothing works..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
              />
              <button
                onClick={() => selectAngle(customAngle)}
                disabled={!customAngle.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                Write Copy for This Angle →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
