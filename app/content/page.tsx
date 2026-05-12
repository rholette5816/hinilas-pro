"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FunnelProgress from "@/components/FunnelProgress";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

const LANGUAGE_OPTIONS = [
  { value: "Taglish", label: "Taglish" },
  { value: "Bisaya-English", label: "Bisaya-English" },
  { value: "Ilocano-English", label: "Ilocano-English" },
  { value: "Pure English", label: "Pure English" },
  { value: "Pure Filipino", label: "Pure Filipino" },
];

const POST_TYPES = [
  { type: "Pain Point", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  { type: "Transformation", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { type: "Objection Crusher", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Social Proof", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { type: "Educational Tip", color: "#1877F2", bg: "#EFF6FF", border: "#BFDBFE" },
  { type: "Urgency/Offer", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Trust Builder", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
];

interface ContentPost {
  type: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string;
  image?: string;
  language: string;
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
    />
  );
}

function normalizePosts(raw: string, language: string): ContentPost[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonText = cleaned.match(/\[[\s\S]*\]/)?.[0] || cleaned;
  const parsed = JSON.parse(jsonText) as Partial<ContentPost>[];

  if (!Array.isArray(parsed)) return [];

  return parsed.slice(0, 7).map((post, index) => {
    const fallbackType = POST_TYPES[index]?.type || "Content Post";
    return {
      type: post.type || fallbackType,
      hook: post.hook || "",
      body: post.body || "",
      cta: post.cta || "",
      hashtags: post.hashtags || "",
      image: post.image,
      language: post.language || language,
    };
  });
}

function copyPost(post: ContentPost) {
  const text = `${post.hook}\n\n${post.body}\n\n${post.cta}\n\n${post.hashtags}`;
  navigator.clipboard.writeText(text);
}

export default function ContentPage() {
  const {
    setup,
    researchOutput,
    contentOutput,
    setContentOutput,
    credits,
    refreshCredits,
  } = useApp();
  const router = useRouter();
  const [language, setLanguage] = useState(setup?.language || "Taglish");
  const [loading, setLoading] = useState(false);
  const [noCredits, setNoCredits] = useState(false);
  const [posts, setPosts] = useState<ContentPost[]>(contentOutput?.posts || []);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5">("1:1");
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const canGenerate = Boolean(researchOutput) && credits >= 7 && !loading;

  async function generateContentPack() {
    if (!setup) return;
    if (!researchOutput) {
      setError("Run Research first to generate content.");
      return;
    }
    if (credits < 7) {
      setNoCredits(true);
      return;
    }

    setLoading(true);
    setError("");
    setNoCredits(false);
    setPosts([]);

    const prompt = MODULE_PROMPTS.content(buildUserContext(setup), researchOutput, language);

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language, module: "content" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.code === "NO_CREDITS") setNoCredits(true);
        throw new Error(data.error || "Content generation failed.");
      }

      const parsedPosts = normalizePosts(data.content, language);
      if (parsedPosts.length !== 7) {
        throw new Error("The content pack response was not a complete 7-post JSON array. Please try again.");
      }

      setPosts(parsedPosts);
      setContentOutput({ posts: parsedPosts, language, generatedAt: new Date().toISOString() });
      await refreshCredits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function generateImage(postIndex: number, post: ContentPost) {
    if (!setup) return;
    if (credits < 2) {
      setNoCredits(true);
      return;
    }

    setImageLoading((prev) => ({ ...prev, [postIndex]: true }));
    setError("");
    setNoCredits(false);

    const prompt = `Create a ready-to-post Facebook/Instagram image for ${setup.businessName}.

Product or service: ${setup.product}
Target audience: ${setup.targetAudience}
Market: ${setup.market}
Language: ${post.language}
Post type: ${post.type}
Hook: ${post.hook}
Body: ${post.body}
CTA: ${post.cta}

Make it feel like a polished Filipino Meta Ads social post. Use a clear focal subject, readable short text only, strong contrast, and a layout that matches the emotional angle of the post. Avoid clutter, distorted faces, blurry text, watermarks, and generic stock-photo energy.`;

    try {
      const res = await fetch("/api/content-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio, postType: post.type, angle: post.hook }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.code === "NO_CREDITS") setNoCredits(true);
        throw new Error(data.error || "Image generation failed.");
      }

      const updatedPosts = posts.map((item, idx) =>
        idx === postIndex ? { ...item, image: data.imageUrl } : item
      );
      setPosts(updatedPosts);
      setContentOutput({ posts: updatedPosts, language, generatedAt: contentOutput?.generatedAt || new Date().toISOString() });
      await refreshCredits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Image generation failed. Try again.");
    } finally {
      setImageLoading((prev) => ({ ...prev, [postIndex]: false }));
    }
  }

  function handleCopy(post: ContentPost, index: number) {
    copyPost(post);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  if (!setup) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <FunnelProgress currentStep={3} />

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-full px-3 py-1 mb-4">
              <span className="text-blue-300 text-xs font-medium">Content Department</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1c1e21] mb-2">Content Pack Generator</h1>
            <p className="text-[#1c1e21] text-sm">
              Turn your research into 7 ready-to-post Facebook and Instagram pieces.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
            <p className="text-[#1c1e21] text-xs font-medium uppercase tracking-wider mb-2">Generating for</p>
            <p className="text-[#1c1e21] font-semibold">{setup.businessName}</p>
            <p className="text-[#1c1e21] text-sm mt-1">{setup.product}</p>
            <p className="text-[#1c1e21] text-xs mt-1">Target: {setup.targetAudience}</p>
          </div>

          {!researchOutput && (
            <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <p className="text-[#1c1e21] text-sm font-semibold">Run Research first to generate content</p>
              <p className="text-[#64748B] text-xs mt-1">The content pack uses your customer pains, desires, and objections from research.</p>
            </div>
          )}

          {(noCredits || (credits < 7 && !loading)) && (
            <div className="rounded-xl p-4 mb-6" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="text-[#991B1B] text-sm font-semibold">Not enough credits</p>
              <p className="text-[#7F1D1D] text-xs mt-1">You need 7 credits to generate the content pack. Images cost 2 credits each.</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 mb-6" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="text-[#991B1B] text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-[#1c1e21]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#1c1e21] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button
              onClick={generateContentPack}
              disabled={!canGenerate}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#1877F2", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
            >
              {loading ? "Generating..." : posts.length > 0 ? "Regenerate Content Pack - 7 credits" : "Generate Content Pack - 7 credits"}
            </button>
          </div>

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {POST_TYPES.map((postType) => (
                <div key={postType.type} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                  <div className="h-5 w-28 rounded-full mb-5" style={{ background: postType.bg }} />
                  <div className="h-6 bg-slate-200 rounded mb-3 w-3/4" />
                  <div className="space-y-2 mb-5">
                    <div className="h-3 bg-slate-200 rounded" />
                    <div className="h-3 bg-slate-200 rounded w-5/6" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                  <div className="h-9 bg-slate-200 rounded-lg w-32" />
                </div>
              ))}
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {posts.map((post, index) => {
                const typeStyle = POST_TYPES.find((item) => item.type === post.type) || POST_TYPES[index] || POST_TYPES[0];
                const isGeneratingImage = Boolean(imageLoading[index]);

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
                          onClick={() => handleCopy(post, index)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-[#1c1e21] hover:border-blue-400 transition-colors"
                        >
                          {copiedIndex === index ? "Copied" : "Copy"}
                        </button>
                      </div>

                      <h2 className="text-[#1c1e21] text-lg font-bold leading-snug mb-3">{post.hook}</h2>
                      <p className="text-[#1c1e21] text-sm leading-relaxed whitespace-pre-line mb-4">{post.body}</p>
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4" style={{ background: "#F0F2F5" }}>
                        <CheckIcon className="h-3.5 w-3.5 text-[#1877F2]" />
                        <p className="text-[#1c1e21] text-xs font-semibold">{post.cta}</p>
                      </div>
                      <p className="text-[#64748B] text-xs leading-relaxed mb-5">{post.hashtags}</p>

                      {post.image && (
                        <div className="mb-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.image}
                            alt={`${post.type} generated creative`}
                            className="w-full rounded-lg border border-slate-200 object-cover"
                          />
                          <a
                            href={post.image}
                            download
                            className="inline-flex mt-3 text-xs font-bold px-3 py-2 rounded-lg transition-opacity hover:opacity-90"
                            style={{ background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0" }}
                          >
                            Download Image
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-slate-200">
                        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                          {(["1:1", "4:5"] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setAspectRatio(ratio)}
                              className="px-3 py-2 text-xs font-bold transition-colors"
                              style={aspectRatio === ratio ? { background: "#1877F2", color: "#FFFFFF" } : { color: "#1c1e21" }}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => generateImage(index, post)}
                          disabled={isGeneratingImage || credits < 2}
                          className="inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                          style={{ background: typeStyle.color }}
                        >
                          {isGeneratingImage ? <><Spinner /> Generating...</> : "Generate Image - 2 credits"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
