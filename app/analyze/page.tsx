"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

interface AdData {
  spend: string;
  reach: string;
  impressions: string;
  ctr: string;
  cpm: string;
  costPerMessage: string;
  frequency: string;
  messages: string;
  productPrice: string;
  productCost: string;
  daysRunning: string;
}

const EMPTY: AdData = {
  spend: "", reach: "", impressions: "", ctr: "", cpm: "",
  costPerMessage: "", frequency: "", messages: "",
  productPrice: "", productCost: "", daysRunning: "",
};

export default function AnalyzePage() {
  const { setup } = useApp();
  const router = useRouter();
  const [data, setData] = useState<AdData>(EMPTY);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  function formatAdData(d: AdData): string {
    return `
Ad Spend: P${d.spend || "?"}
Reach: ${d.reach || "?"}
Impressions: ${d.impressions || "?"}
CTR: ${d.ctr || "?"}%
CPM: P${d.cpm || "?"}
Cost Per Message: P${d.costPerMessage || "?"}
Frequency: ${d.frequency || "?"}
Messages/Conversations: ${d.messages || "?"}
Days Running: ${d.daysRunning || "?"}
Product Selling Price: P${d.productPrice || "not provided"}
Product Cost: P${d.productCost || "not provided"}
    `.trim();
  }

  async function analyze() {
    if (!setup) return;
    setLoading(true);
    setOutput("");

    const userCtx = buildUserContext(setup);
    const adDataStr = formatAdData(data);
    const prompt = MODULE_PROMPTS.analyze(userCtx, adDataStr);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE }),
      });
      const d = await res.json();
      setOutput(d.error ? `Error: ${d.error}` : d.content);
    } catch {
      setOutput("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function field(label: string, key: keyof AdData, placeholder: string, prefix = "") {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{prefix}</span>}
          <input
            type="text"
            value={data[key]}
            onChange={e => setData(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            className={`w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${prefix ? "pl-7 pr-3" : "px-3"}`}
          />
        </div>
      </div>
    );
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
            <div className="inline-flex items-center gap-2 bg-yellow-950 border border-yellow-800 rounded-full px-3 py-1 mb-4">
              <span className="text-yellow-300 text-xs font-medium">📊 Analyze</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Analyze Your Ad Results</h1>
            <p className="text-gray-400 text-sm">Paste your numbers. Get a clear diagnosis and specific next steps based on PH benchmarks.</p>
          </div>

          {/* Form */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
            <p className="text-gray-300 text-sm font-semibold mb-4">Ad Performance Data</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {field("Ad Spend (PHP)", "spend", "e.g. 1500", "P")}
              {field("Days Running", "daysRunning", "e.g. 7")}
              {field("Reach", "reach", "e.g. 12000")}
              {field("Impressions", "impressions", "e.g. 18000")}
              {field("CTR (%)", "ctr", "e.g. 2.5")}
              {field("CPM (PHP)", "cpm", "e.g. 150", "P")}
              {field("Cost Per Message (PHP)", "costPerMessage", "e.g. 45", "P")}
              {field("Messages / Conversations", "messages", "e.g. 33")}
              {field("Frequency", "frequency", "e.g. 1.8")}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Optional — for profit analysis</p>
              <div className="grid grid-cols-2 gap-4">
                {field("Product Selling Price (PHP)", "productPrice", "e.g. 499", "P")}
                {field("Product Cost (PHP)", "productCost", "e.g. 180", "P")}
              </div>
            </div>
          </div>

          {/* Benchmarks reference */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">PH Benchmarks</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Cost/Message excellent</span><span className="text-green-400">P15–60</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CTR excellent</span><span className="text-green-400">3–5%</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Cost/Message stop</span><span className="text-red-400">P350+</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CTR bad</span><span className="text-red-400">below 1%</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CPM good</span><span className="text-blue-400">P120–180</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Frequency healthy</span><span className="text-blue-400">1–2.5</span></div>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full text-white py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 mb-6" style={{ background: "#2B7EC9" }}
          >
            {loading ? "Analyzing..." : "Analyze My Results"}
          </button>

          {/* Output */}
          <AIOutput content={output} loading={loading} loadingText="Diagnosing your ad results..." />
        </div>
      </main>
    </div>
  );
}
