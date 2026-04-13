"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

const MODULES = [
  {
    title: "Phase 1 — Foundation",
    color: "#2B7EC9",
    topics: [
      "What do I need before running Meta Ads?",
      "How do I create a Facebook Business Portfolio?",
      "What kind of Facebook account should I use for ads?",
      "What payment methods work for Meta Ads in the Philippines?",
      "How do I create and set up a Facebook Page for my business?",
      "What starting budget do I need?",
      "What mistakes should I avoid before running ads?",
    ],
  },
  {
    title: "Phase 2 — Setup",
    color: "#8B5CF6",
    topics: [
      "How do I create a Meta Ads account?",
      "How do I connect my Facebook Page to my Ad Account?",
      "How do I add a payment method in Meta Ads Manager?",
      "What is Business Manager and do I need it?",
      "How do I verify my business on Meta?",
      "What is the Facebook Pixel and how do I set it up?",
      "How do I set up a Messenger auto-reply before launching?",
    ],
  },
  {
    title: "Phase 3 — Launch",
    color: "#F5A623",
    topics: [
      "What is Campaign, Ad Set, and Ad?",
      "What campaign objective should I use for my first campaign?",
      "Why use Engagement — Messages objective?",
      "How do I set up my first campaign step by step?",
      "What is Ad Set Budget vs Campaign Budget?",
      "What is the best daily budget to start with?",
      "How do I set my campaign start date and schedule?",
      "What is Advantage+ Campaign Budget and should I use it?",
      "How do I set up the Messenger destination and chat flow?",
    ],
  },
  {
    title: "Phase 4 — Targeting",
    color: "#10B981",
    topics: [
      "How does broad targeting work in 2025?",
      "Should I use interest targeting or leave it blank?",
      "What is Advantage+ Audience and how does it work?",
      "What audience size is ideal for Philippine ads?",
      "How do I target by location in the Philippines?",
      "What are Custom Audiences and how do I use them?",
      "What are Lookalike Audiences?",
      "How do I retarget people who messaged me before?",
    ],
  },
  {
    title: "Phase 5 — Creative & Copy",
    color: "#EC4899",
    topics: [
      "What are marketing angles and why do they matter?",
      "What are the 5 types of marketing angles?",
      "How do I write a scroll-stopping hook?",
      "What is the PAS formula and how do I use it?",
      "What is the BAB formula?",
      "What is the AIDA formula?",
      "What is the Story formula?",
      "What makes a good ad image?",
      "How long should my ad caption be?",
      "What is a CTA and what CTA should I use?",
    ],
  },
  {
    title: "Phase 6 — Metrics & Optimization",
    color: "#EF4444",
    topics: [
      "What metrics should I track in Meta Ads?",
      "What is a good Cost Per Message in the Philippines?",
      "What is CTR and what is a good rate?",
      "What is CPM and why does it matter?",
      "What is Frequency and when is it too high?",
      "What is the Learning Phase and how long does it last?",
      "How do I know if my ad is working?",
      "When should I turn off an ad?",
      "How do I scale my budget safely?",
      "What is ad creative fatigue and how do I fix it?",
      "How do I calculate my profit from ads?",
    ],
  },
  {
    title: "Phase 7 — Troubleshooting",
    color: "#6B7280",
    topics: [
      "Why is my ad not getting approved?",
      "Why was my ad account disabled and how do I recover it?",
      "Why am I spending but getting no messages?",
      "Why are my messages not converting to sales?",
      "Why did my ad stop performing after a few days?",
      "What are the 8 beginner mistakes to avoid?",
      "What are Meta Ads policies I should know?",
      "How do I duplicate a winning ad set?",
      "How do I refresh a creative without resetting the learning phase?",
    ],
  },
];

export default function LearnPage() {
  const { setup, plan } = useApp();
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeModule, setActiveModule] = useState<number | null>(null);

  if (plan !== "max") { // requires 300+ credits
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-3 py-1 mb-4">
                <span className="text-indigo-300 text-xs font-medium">📖 Courses</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Meta Ads Course</h1>
              <p className="text-gray-400 text-sm">Full Meta Ads roadmap from zero to profitable campaigns.</p>
            </div>

            {/* Locked state */}
            <div className="rounded-2xl border border-gray-700 px-6 py-10 text-center" style={{ background: "#0F172A" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#1E293B" }}>
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Hinilas Max Exclusive</h2>
              <p className="text-gray-400 text-sm mb-1">The full Meta Ads course is only available on the <span className="text-white font-semibold">Hinilas Max</span> plan.</p>
              <p className="text-gray-500 text-xs mb-6">7 phases · 61 topics · Video lessons · Downloadable PDFs</p>
              <a
                href="/pricing"
                className="inline-block text-white text-sm font-semibold px-6 py-3 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: "#2B7EC9" }}
              >
                Upgrade to Max
              </a>
              <p className="text-gray-600 text-xs mt-3">₱2,499/month · 500 credits · Full course access</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  async function askQuestion(q: string) {
    const question = q || topic.trim();
    if (!question) return;
    setTopic(question);
    setLoading(true);
    setOutput("");

    const userCtx = setup ? buildUserContext(setup) : "No business profile set yet.";
    const prompt = MODULE_PROMPTS.learn(question, userCtx);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
      });
      const data = await res.json();
      setOutput(data.error ? data.error : data.content);
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
            <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-3 py-1 mb-4">
              <span className="text-indigo-300 text-xs font-medium">📖 Courses</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Meta Ads Course</h1>
            <p className="text-gray-400 text-sm">Full Meta Ads roadmap from zero to profitable campaigns. Pick a topic or ask your own question.</p>
          </div>

          {/* Custom question */}
          <div className="flex gap-2 mb-8">
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && askQuestion("")}
              placeholder="Ask anything about Meta Ads..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => askQuestion("")}
              disabled={!topic.trim() || loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Ask
            </button>
          </div>

          {/* Output */}
          {(output || loading) && (
            <div className="mb-8 space-y-4">
              {/* Video lesson slot */}
              <div className="rounded-xl border border-gray-700 overflow-hidden" style={{ background: "#0F172A" }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Video Lesson</span>
                  <span className="text-xs text-gray-600">— coming soon</span>
                </div>
                <div className="flex items-center justify-center py-10 px-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-600 text-lg">▶</span>
                    </div>
                    <p className="text-gray-500 text-sm">Video for this topic will be available here.</p>
                  </div>
                </div>
              </div>

              {/* PDF download slot */}
              <div className="rounded-xl border border-gray-700 px-4 py-3 flex items-center justify-between" style={{ background: "#0F172A" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-dashed border-gray-600 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">PDF</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Downloadable Notes</p>
                    <p className="text-xs text-gray-600">PDF handout for this lesson — coming soon</p>
                  </div>
                </div>
                <button disabled className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-600 cursor-not-allowed">
                  Download
                </button>
              </div>

              {/* AI lesson */}
              <AIOutput content={output} loading={loading} loadingText="Loading lesson..." />
            </div>
          )}

          {/* Modules */}
          <div className="space-y-3">
            {MODULES.map((mod, i) => (
              <div key={i} className="border border-gray-700 rounded-xl overflow-hidden" style={{ background: "#0F172A" }}>
                <button
                  onClick={() => setActiveModule(activeModule === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: mod.color }} />
                    <span className="text-white font-semibold text-sm">{mod.title}</span>
                    <span className="text-gray-600 text-xs">{mod.topics.length} topics</span>
                  </div>
                  <span className="text-gray-500 text-sm">{activeModule === i ? "▲" : "▼"}</span>
                </button>

                {activeModule === i && (
                  <div className="border-t border-gray-700 px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {mod.topics.map(t => (
                        <button
                          key={t}
                          onClick={() => askQuestion(t)}
                          className="text-xs border px-3 py-1.5 rounded-full transition-colors hover:text-white"
                          style={{
                            background: "#1E293B",
                            borderColor: mod.color + "50",
                            color: "#CBD5E1",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
