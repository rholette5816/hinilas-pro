"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
      style={{ background: copied ? "#22c55e20" : "#1E293B", color: copied ? "#22c55e" : "#9CA3AF", border: `1px solid ${copied ? "#22c55e40" : "#374151"}` }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

interface CaptionVariation {
  title: string;
  caption: string;
  headline: string;
  cta: string;
}

function parseCaptionVariations(output: string): CaptionVariation[] {
  const blocks = output.split(/(?=\*\*VARIATION\s+\d+)/i).filter(b => b.trim() && /\*\*VARIATION\s+\d+/i.test(b));
  return blocks.map(block => {
    const titleMatch = block.match(/\*\*VARIATION\s+\d+[^*]*\*\*/i);
    const title = titleMatch ? titleMatch[0].replace(/\*\*/g, "").trim() : "Variation";
    const captionMatch = block.match(/\*\*CAPTION:\*\*\s*([\s\S]*?)(?=\*\*HEADLINE:|$)/i);
    const headlineMatch = block.match(/\*\*HEADLINE:\*\*\s*(.+)/i);
    const ctaMatch = block.match(/\*\*CTA BUTTON:\*\*\s*(.+)/i);
    return {
      title,
      caption: captionMatch?.[1]?.trim() || "",
      headline: headlineMatch?.[1]?.trim() || "",
      cta: ctaMatch?.[1]?.trim() || "",
    };
  });
}

const FORMULAS = [
  { key: "PAS", label: "PAS", angle: "Problem Angle", desc: "Problem → Agitate → Solution → CTA" },
  { key: "BAB", label: "BAB", angle: "Transformation", desc: "Before → After → Bridge" },
  { key: "AIDA", label: "AIDA", angle: "Educational", desc: "Attention → Interest → Desire → Action" },
  { key: "Story", label: "Story", angle: "Story Angle", desc: "Hook → Story → Lesson → CTA" },
];

const LANGUAGES = [
  { value: "Taglish", label: "Taglish", sub: "Tagalog + English" },
  { value: "Bislish", label: "Bislish", sub: "Bisaya + English" },
  { value: "Filipino", label: "Filipino", sub: "Tagalog" },
  { value: "Bisaya", label: "Bisaya", sub: "Cebuano" },
  { value: "Ilocano", label: "Ilocano", sub: "Northern Luzon" },
  { value: "Hiligaynon", label: "Hiligaynon", sub: "Ilonggo" },
  { value: "Kapampangan", label: "Kapampangan", sub: "Pampanga" },
  { value: "English", label: "English", sub: "Formal" },
];

export default function CopyPage() {
  const { setup, creativeImage, copyOutput, setCopyOutput, credits, refreshCredits } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [noCredits, setNoCredits] = useState(false);
  const output = copyOutput;
  const setOutput = setCopyOutput;
  const [selectedFormulas, setSelectedFormulas] = useState<string[]>([]);
  const [language, setLanguage] = useState(setup?.language || "Taglish");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const activeImage = uploadedImage || creativeImage || null;

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleFormula(key: string) {
    setSelectedFormulas(prev => {
      if (prev.includes(key)) return prev.filter(f => f !== key);
      if (prev.length >= 2) return prev;
      return [...prev, key];
    });
  }

  async function generateCopy() {
    if (!setup || !activeImage) return;
    if (credits < 1) { setNoCredits(true); return; }
    setLoading(true);
    setOutput("");

    // Deduct 1 credit
    const deduct = await fetch("/api/credits/use", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: 1, description: "Copy generation" }) });
    if (!deduct.ok) { setNoCredits(true); setLoading(false); return; }
    await refreshCredits();

    const formulas = selectedFormulas.length > 0 ? selectedFormulas : ["PAS", "BAB"];
    const userCtx = buildUserContext(setup, language);
    const prompt = MODULE_PROMPTS.copy(userCtx, formulas, language);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt: HILAS_KNOWLEDGE,
          images: [activeImage],
          module: "copy",
        }),
      });
      const data = await res.json();
      setOutput(data.error ? data.error : data.content);
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
      {noCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-white font-bold text-lg mb-2">Not enough credits</h2>
            <p className="text-gray-400 text-sm mb-6">Copy generation costs 1 credit. Top up to continue.</p>
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
            <div className="inline-flex items-center gap-2 bg-purple-950 border border-purple-800 rounded-full px-3 py-1 mb-4">
              <span className="text-purple-300 text-xs font-medium">✍ Caption Department</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Write Your Captions</h1>
            <p className="text-gray-400 text-sm">AI reads your generated ad image and writes captions that match it. Pick up to 2 formulas.</p>
          </div>

          {/* Ad image reference */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-300">Ad Image Reference</p>
              <button
                onClick={() => uploadRef.current?.click()}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
              >
                Upload your own image
              </button>
              <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            {activeImage ? (
              <div>
                <div className="rounded-xl overflow-hidden border border-gray-700 max-w-xs">
                  <img src={activeImage} alt="Ad image reference" className="w-full object-cover" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-gray-500 text-xs">
                    {uploadedImage ? "Uploaded image" : "Generated from Creative"} — copy will be based on this.
                  </p>
                  {uploadedImage && (
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 border border-dashed border-gray-600 rounded-xl px-5 py-6 text-center">
                <p className="text-gray-400 text-sm mb-3">No image yet. Upload one or generate from Creative.</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => uploadRef.current?.click()}
                    className="text-white px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: "#2B7EC9" }}
                  >
                    Upload Image
                  </button>
                  <button
                    onClick={() => router.push("/creative")}
                    className="text-gray-300 px-4 py-2 rounded-lg text-xs font-semibold border border-gray-600 hover:border-gray-500"
                  >
                    Go to Creative
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Language selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Language / Dialect</label>
            <div className="grid grid-cols-4 gap-2">
              {LANGUAGES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className="p-2.5 rounded-lg border text-left transition-all"
                  style={language === opt.value
                    ? { background: "#2B7EC9", borderColor: "#2B7EC9", color: "white" }
                    : { background: "#1E293B", borderColor: "#374151", color: "#9CA3AF" }
                  }
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
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
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={generateCopy}
              disabled={loading || !activeImage}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#2B7EC9", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
            >
              {loading ? "Writing..." : output ? "Rewrite Captions — 1 credit" : "Generate Captions — 1 credit"}
            </button>
            {output && !loading && (
              <button
                onClick={() => router.push("/campaign-setup")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 text-white"
                style={{ background: "#F5A623", animation: "btnGlowOrange 2s ease-in-out infinite alternate" }}
              >
                Proceed to Campaign Setup →
              </button>
            )}
          </div>

          {/* Output */}
          {loading && <AIOutput content="" loading={true} loadingText="Writing your captions..." />}

          {output && !loading && (() => {
            const variations = parseCaptionVariations(output);
            if (variations.length === 0) return <AIOutput content={output} loading={false} />;
            return (
              <div className="space-y-4">
                {variations.map((v, idx) => (
                  <div key={idx} className="rounded-xl border border-gray-700 overflow-hidden" style={{ background: "#0F172A" }}>
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800" style={{ background: "#0A0F1A" }}>
                      <span className="text-blue-400 text-xs font-bold uppercase tracking-wide">{v.title}</span>
                      <CopyButton text={`${v.caption}\n\nHeadline: ${v.headline}\nCTA: ${v.cta}`} label="Copy" />
                    </div>
                    {/* Caption */}
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-xs font-semibold text-gray-500 mb-2">CAPTION</p>
                      <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{v.caption}</p>
                    </div>
                    {/* Headline + CTA */}
                    <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {v.headline && (
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">HEADLINE</p>
                            <p className="text-white text-sm font-medium">{v.headline}</p>
                          </div>
                          <CopyButton text={v.headline} label="Copy" />
                        </div>
                      )}
                      {v.cta && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">CTA BUTTON</p>
                          <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#2B7EC920", color: "#2B7EC9", border: "1px solid #2B7EC940" }}>
                            {v.cta}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}
