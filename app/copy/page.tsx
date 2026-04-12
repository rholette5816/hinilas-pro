"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIOutput from "@/components/AIOutput";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

function CopyButton({ text }: { text: string }) {
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
      {copied ? "Copied!" : "Copy All"}
    </button>
  );
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
  const { setup, creativeImage, copyOutput, setCopyOutput } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    setOutput("");

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
        }),
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
              style={{ background: "#2B7EC9" }}
            >
              {loading ? "Writing..." : output ? "Rewrite Captions" : "Generate Captions"}
            </button>
            {output && !loading && (
              <button
                onClick={() => router.push("/campaign-setup")}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40" }}
              >
                Proceed to Campaign Setup →
              </button>
            )}
          </div>

          {/* Output */}
          {output && !loading && (
            <div className="flex justify-end mb-2">
              <CopyButton text={output} />
            </div>
          )}
          <AIOutput content={output} loading={loading} loadingText="Writing your captions..." />

        </div>
      </main>
    </div>
  );
}
