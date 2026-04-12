"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { HILAS_KNOWLEDGE } from "@/lib/knowledge";

const EXPERT_CREDIT_COST = 10;

const QUICK_QUESTIONS = [
  "My ads are spending but I'm getting zero messages. What's wrong?",
  "Should I scale my budget or duplicate my ad set?",
  "My Cost Per Message is P350+. What do I do?",
  "How do I know if my creative is the problem?",
  "I've been running ads for 3 days with no results. Turn off or wait?",
  "What's the fastest way to find a winning ad?",
];

const EXPERT_SYSTEM_PROMPT = `${HILAS_KNOWLEDGE}

# EXPERT MODE
You are now acting as a senior Meta Ads strategist — the most experienced person in the room. The user is paying premium credits to get your best advice.

Rules:
- Be extremely direct. No padding, no filler.
- Give a specific diagnosis, not generic tips.
- Use numbers and benchmarks from PH context (pesos, CTR %, CPM).
- If something is wrong, say it plainly.
- End with exactly 3 next actions, numbered.
- Max 300 words total. Quality over quantity.
`;

export default function ExpertPage() {
  const { setup, credits, plan, refreshCredits } = useApp();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionUsed, setSessionUsed] = useState(false);

  const canAsk = credits >= EXPERT_CREDIT_COST && (plan === "flex" || plan === "max");

  async function askExpert(q: string) {
    const finalQ = q || question.trim();
    if (!finalQ || loading || !canAsk) return;
    setQuestion(finalQ);
    setLoading(true);
    setOutput("");

    // Deduct credits first
    try {
      const deductRes = await fetch("/api/credits/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: EXPERT_CREDIT_COST }),
      });
      if (!deductRes.ok) {
        setOutput("Not enough credits.");
        setLoading(false);
        return;
      }
    } catch {
      setOutput("Something went wrong. Try again.");
      setLoading(false);
      return;
    }

    await refreshCredits();
    setSessionUsed(true);

    const userCtx = setup ? buildUserContext(setup) : "No business profile set.";
    const prompt = `
# USER CONTEXT
${userCtx}

# QUESTION
${finalQ}

Give your best expert answer. Be direct, specific, and actionable.
`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: EXPERT_SYSTEM_PROMPT }),
      });
      const data = await res.json();
      setOutput(data.error ? `Error: ${data.error}` : data.content);
    } catch {
      setOutput("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-950 border border-amber-800 rounded-full px-3 py-1 mb-4">
              <span className="text-amber-300 text-xs font-medium">🎙 Expert</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ask an Expert</h1>
            <p className="text-gray-400 text-sm">Direct, senior-level Meta Ads advice. No fluff — just what to do next.</p>
          </div>

          {/* Credit cost notice */}
          <div className="rounded-xl border border-amber-900 px-4 py-3 mb-6 flex items-center justify-between" style={{ background: "#1C1200" }}>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-lg">⚡</span>
              <div>
                <p className="text-amber-300 text-sm font-semibold">10 credits per session</p>
                <p className="text-amber-700 text-xs">Each question uses 10 credits. You have {credits} remaining.</p>
              </div>
            </div>
            {!canAsk && (plan === "lite" || credits < EXPERT_CREDIT_COST) && plan !== "flex" && plan !== "max" && (
              <button
                onClick={() => router.push("/pricing")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#2B7EC9" }}
              >
                Upgrade
              </button>
            )}
            {!canAsk && plan !== "lite" && credits < EXPERT_CREDIT_COST && (
              <button
                onClick={() => router.push("/pricing#topup")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#F5A623" }}
              >
                Get Credits
              </button>
            )}
          </div>

          {/* Quick questions */}
          {!output && !loading && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-400 mb-3">Common situations</p>
              <div className="space-y-2">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => askExpert(q)}
                    disabled={!canAsk}
                    className="w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-700 hover:text-white"
                    style={{ background: "#0F172A", borderColor: "#374151", color: "#CBD5E1" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom question */}
          <div className="flex gap-2 mb-8">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && askExpert("")}
              placeholder="Describe your situation or problem..."
              disabled={!canAsk}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40"
            />
            <button
              onClick={() => askExpert("")}
              disabled={!question.trim() || loading || !canAsk}
              className="text-white px-5 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#F5A623", color: "#000" }}
            >
              Ask
            </button>
          </div>

          {/* Output */}
          {(output || loading) && (
            <div>
              {sessionUsed && !loading && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "#F5A623", color: "#000" }}>
                    ✓
                  </div>
                  <p className="text-xs text-gray-500">10 credits used · {credits} remaining</p>
                </div>
              )}
              <AIOutput content={output} loading={loading} loadingText="Getting expert answer..." />
              {output && !loading && (
                <button
                  onClick={() => { setOutput(""); setQuestion(""); setSessionUsed(false); }}
                  className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Ask another question
                </button>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
