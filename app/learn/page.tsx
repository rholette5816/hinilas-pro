"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

const QUICK_TOPICS = [
  "What do I need before running ads?",
  "How do I set up my Business Portfolio?",
  "What is Campaign, Ad Set, and Ad?",
  "What campaign objective should I use?",
  "What is the Learning Phase?",
  "How do I set up Messenger auto-reply?",
  "What is Conversations Optimization?",
  "How does broad targeting work in 2025?",
  "What are marketing angles?",
  "How do I write a hook for my ad?",
  "What is PAS formula?",
  "How do I know if my ad is working?",
  "When should I turn off an ad?",
  "How do I scale my budget safely?",
  "What is ad creative fatigue?",
];

export default function LearnPage() {
  const { setup } = useApp();
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

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
            <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-3 py-1 mb-4">
              <span className="text-indigo-300 text-xs font-medium">📖 Learn</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Marketing & Ads Education</h1>
            <p className="text-gray-400 text-sm">Ask anything about Meta Ads, marketing, or the Hilas system. Pick a topic or type your own question.</p>
          </div>

          {/* Quick topics */}
          <div className="mb-6">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Quick Topics</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => askQuestion(t)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Custom question */}
          <div className="flex gap-2 mb-6">
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
          <AIOutput content={output} loading={loading} loadingText="Loading lesson..." />
        </div>
      </main>
    </div>
  );
}
