"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AILoadingState from "@/components/AILoadingState";
import FunnelProgress from "@/components/FunnelProgress";
import TierLock from "@/components/TierLock";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

interface ContentPost {
  type: string;
  caption: string;
}

type ActiveTab = "captions" | "scripts";
type HookStyle = "numerical" | "commanding" | "hereswhy";

const POST_TYPES = [
  { type: "Problem Hook", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  { type: "Solution Reveal", color: "#1877F2", bg: "#EFF6FF", border: "#BFDBFE" },
  { type: "Testimonial Story", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { type: "Educational", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Urgency Offer", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Transformation", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { type: "Behind the Scenes", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
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

const HOOK_STYLE_OPTIONS: { value: HookStyle; label: string }[] = [
  { value: "numerical", label: "Numerical" },
  { value: "commanding", label: "Commanding" },
  { value: "hereswhy", label: "Here's Why" },
];


function parseContentPosts(raw: string): ContentPost[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonText = cleaned.match(/\[[\s\S]*\]/)?.[0] || cleaned;
  const parsed = JSON.parse(jsonText) as Array<Partial<ContentPost>>;

  if (!Array.isArray(parsed)) return [];

  return parsed.slice(0, 7).map((post, index) => ({
    type: post.type || POST_TYPES[index]?.type || "Content Post",
    caption: post.caption || "",
  }));
}

export default function ContentPage() {
  const {
    setup,
    researchOutput,
    contentOutput,
    setContentOutput,
    credits,
    refreshCredits,
    plan,
  } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<ContentPost[]>(contentOutput?.posts || []);
  const [noCredits, setNoCredits] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("captions");
  const [language, setLanguage] = useState(contentOutput?.language || setup?.language || "Taglish");
  const [scriptBatch, setScriptBatch] = useState<string[]>(contentOutput?.scripts || []);
  const [scriptBatchLoading, setScriptBatchLoading] = useState(false);
  const [scriptNoCredits, setScriptNoCredits] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [globalHookStyle, setGlobalHookStyle] = useState<HookStyle>((contentOutput?.scriptHookStyle as HookStyle) || "numerical");
  const [copiedScriptBatchIndex, setCopiedScriptBatchIndex] = useState<number | null>(null);

  const isLite = plan === "lite";

  async function generateContent() {
    if (!setup) return;
    if (credits < 7) {
      setNoCredits(true);
      return;
    }

    setLoading(true);
    setNoCredits(false);
    setError("");

    const prompt = MODULE_PROMPTS.content(buildUserContext(setup, language), researchOutput, language);

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, module: "content" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.code === "NO_CREDITS") {
          setNoCredits(true);
          return;
        }
        throw new Error(data.error || "Content generation failed.");
      }

      const parsedPosts = parseContentPosts(data.content || "");
      if (parsedPosts.length !== 7 || parsedPosts.some((post) => !post.caption.trim())) {
        throw new Error("The content response was not a complete 7-post JSON array. Please try again.");
      }

      setPosts(parsedPosts);
      setContentOutput({
        posts: parsedPosts.map((post) => ({ ...post, language })),
        language,
        generatedAt: new Date().toISOString(),
      });
      await refreshCredits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function generateScriptBatch() {
    if (!setup) return;
    if (credits < 7) {
      setScriptNoCredits(true);
      return;
    }

    setScriptBatchLoading(true);
    setScriptError("");
    setScriptNoCredits(false);
    setScriptBatch([]);

    const results: string[] = [];

    try {
      for (const postType of POST_TYPES) {
        const context = researchOutput.trim()
          ? `Post type: ${postType.type}\n\nResearch context:\n${researchOutput}`
          : `Post type: ${postType.type}\n\n${setup.businessName} sells ${setup.product} to ${setup.targetAudience}`;
        const prompt = MODULE_PROMPTS.contentScript(context, globalHookStyle, language);
        const res = await fetch("/api/content-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, module: "content-script" }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          if (data.code === "NO_CREDITS") {
            setScriptNoCredits(true);
            await refreshCredits();
            break;
          }
          throw new Error(data.error || "Script generation failed.");
        }

        results.push(data.script || "");
      }

      if (results.length === POST_TYPES.length) {
        setScriptBatch(results);
        setContentOutput({
          posts: contentOutput?.posts || [],
          language,
          scripts: results,
          scriptHookStyle: globalHookStyle,
          generatedAt: new Date().toISOString(),
        });
      }
      await refreshCredits();
    } catch (err: unknown) {
      setScriptError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      await refreshCredits();
    } finally {
      setScriptBatchLoading(false);
    }
  }

  function copyCaption(caption: string, index: number) {
    navigator.clipboard.writeText(caption);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1500);
  }

  function copyScript(script: string, index: number) {
    navigator.clipboard.writeText(script);
    setCopiedScriptBatchIndex(index);
    window.setTimeout(() => setCopiedScriptBatchIndex(null), 2000);
  }

function renderLanguageSelector() {
    return (
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
          Language / Dialect
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {LANGUAGES.map((option) => {
            const active = language === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className="rounded-lg px-3 py-3 text-left transition-colors"
                style={{
                  background: active ? "#1877F2" : "#f2f3f5",
                  color: active ? "#FFFFFF" : "#374151",
                  border: `1px solid ${active ? "#1877F2" : "#E4E6EB"}`,
                }}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs opacity-80">{option.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (isLite) {
    return (
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <TierLock requiredTier="Flex" featureName="Content Creation" />
        </div>
      </main>
    );
  }

  if (!setup) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#1c1e21] mb-4">Set up your business profile first.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            Go to Setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      {noCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-sm w-full mx-4 text-center">
            <div
              className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-lg"
              style={{ border: "1px solid rgba(217,119,6,0.4)", color: "#D97706" }}
            >
              !
            </div>
            <h2 className="text-[#1c1e21] font-bold text-lg mb-2">Not enough credits</h2>
            <p className="text-[#1c1e21] text-sm mb-6">Content creation costs 7 credits. Top up to continue.</p>
            <div className="flex flex-col gap-3">
              <a
                href="/pricing"
                className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center"
                style={{ background: "#D97706" }}
              >
                View Plans
              </a>
              <button onClick={() => setNoCredits(false)} className="text-[#1c1e21] text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {scriptNoCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-sm w-full mx-4 text-center">
            <div
              className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-lg"
              style={{ border: "1px solid rgba(124,58,237,0.4)", color: "#7C3AED" }}
            >
              !
            </div>
            <h2 className="text-[#1c1e21] font-bold text-lg mb-2">Not enough credits</h2>
            <p className="text-[#1c1e21] text-sm mb-6">One week of scripts costs 7 credits. Top up to continue.</p>
            <div className="flex flex-col gap-3">
              <a
                href="/pricing"
                className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center"
                style={{ background: "#7C3AED" }}
              >
                View Plans
              </a>
              <button onClick={() => setScriptNoCredits(false)} className="text-[#1c1e21] text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <FunnelProgress currentStep={5} />

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { id: "captions" as const, label: "1 Week Captions" },
              { id: "scripts" as const, label: "1 Week Scripts" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "#1877F2" : "#f2f3f5",
                    color: active ? "#FFFFFF" : "#374151",
                    border: `1px solid ${active ? "#1877F2" : "#E4E6EB"}`,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "captions" ? (
            <p className="text-sm text-[#65676B] mb-6">
              7 ready-to-post Facebook captions, one per content type. Hook, body, and CTA in your dialect. Copy and post directly.
            </p>
          ) : (
            <p className="text-sm text-[#65676B] mb-6">
              7 talking head video scripts for Reels and Stories. Each script follows the viral formula: Hook, Context, Curiosity Loop, Value, CTA. Read straight to camera.
            </p>
          )}

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-full px-3 py-1 mb-4">
              <span className="text-blue-300 text-xs font-medium">Content Department</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1c1e21] mb-2">
              {activeTab === "captions" ? "Generate Your Content Pack" : "Generate Your Script Pack"}
            </h1>
            <p className="text-[#1c1e21] text-sm">
              {activeTab === "captions"
                ? "7 ready-to-post captions based on your business and research."
                : "7 talking head scripts based on your business and research."}
            </p>
          </div>

          {activeTab === "captions" && (
            <>
              {renderLanguageSelector()}

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6">
                <button
                  onClick={generateContent}
                  disabled={loading}
                  className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#1877F2", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
                >
                  {loading ? "Generating..." : posts.length > 0 ? "Regenerate Content Pack - 7 credits" : "Generate Content Pack - 7 credits"}
                </button>
              </div>

              {error && (
                <div className="rounded-xl p-4 mb-6" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <p className="text-[#991B1B] text-sm font-semibold">{error}</p>
                </div>
              )}

              {loading && (
                <AILoadingState
                  messages={[
                    "Studying your business profile...",
                    "Turning research into post ideas...",
                    "Writing scroll-stopping captions...",
                    "Finalizing your 7-post content pack...",
                  ]}
                  estimatedTime="This takes about 1-2 minutes."
                  icon="P"
                />
              )}

              {!loading && posts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  {posts.map((post, index) => {
                    const typeStyle = POST_TYPES.find((item) => item.type === post.type) || POST_TYPES[index] || POST_TYPES[0];

                    return (
                      <article
                        key={`${post.type}-${index}`}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                        style={{ borderLeft: `5px solid ${typeStyle.color}` }}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-bold"
                              style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}
                            >
                              {post.type}
                            </span>
                            <button
                              onClick={() => copyCaption(post.caption, index)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-[#1c1e21] hover:border-blue-400 transition-colors"
                            >
                              {copiedIndex === index ? "Copied" : "Copy"}
                            </button>
                          </div>

                          <p className="text-[#1c1e21] text-sm leading-relaxed whitespace-pre-line">{post.caption}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "scripts" && (
            <>
              {renderLanguageSelector()}

              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
                  Hook Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {HOOK_STYLE_OPTIONS.map((option) => {
                    const active = globalHookStyle === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGlobalHookStyle(option.value)}
                        className="rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
                        style={{
                          background: active ? "#1877F2" : "#f2f3f5",
                          color: active ? "#FFFFFF" : "#374151",
                          border: `1px solid ${active ? "#1877F2" : "#E4E6EB"}`,
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={generateScriptBatch}
                disabled={scriptBatchLoading || credits < 7}
                className="w-full text-white py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 mb-6"
                style={{ background: "#7C3AED" }}
              >
                {scriptBatchLoading && (
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {scriptBatchLoading
                  ? "Writing scripts..."
                  : scriptBatch.length > 0
                    ? "Regenerate 1 Week Scripts - 7 credits"
                    : "Generate 1 Week Scripts - 7 credits"}
              </button>

              {scriptError && (
                <div className="rounded-xl p-4 mb-6" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <p className="text-[#991B1B] text-sm font-semibold">{scriptError}</p>
                </div>
              )}

              {scriptBatch.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  {scriptBatch.map((script, index) => {
                    const typeStyle = POST_TYPES[index] || POST_TYPES[0];
                    return (
                      <article key={`${typeStyle.type}-script-${index}`} className="bg-white border border-slate-200 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: typeStyle.color }} />
                            <span className="text-xs font-bold text-[#1c1e21] truncate">{typeStyle.type}</span>
                          </div>
                          <button
                            onClick={() => copyScript(script, index)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-[#1c1e21] hover:border-purple-400 transition-colors shrink-0"
                          >
                            {copiedScriptBatchIndex === index ? "Copied" : "Copy Script"}
                          </button>
                        </div>
                        <p className="text-[#1c1e21] text-sm leading-relaxed whitespace-pre-wrap">{script}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
