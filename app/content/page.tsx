"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AILoadingState from "@/components/AILoadingState";
import FunnelProgress from "@/components/FunnelProgress";
import TierLock from "@/components/TierLock";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";

interface ContentPost {
  type: string;
  caption: string;
}

const POST_TYPES = [
  { type: "Problem Hook", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  { type: "Solution Reveal", color: "#1877F2", bg: "#EFF6FF", border: "#BFDBFE" },
  { type: "Testimonial Story", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { type: "Educational", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Urgency Offer", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Transformation", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { type: "Behind the Scenes", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
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

  const isLite = plan === "lite";
  const isMax = plan === "max";

  async function generateContent() {
    if (!setup) return;
    if (credits < 1) {
      setNoCredits(true);
      return;
    }

    setLoading(true);
    setNoCredits(false);
    setError("");

    const deduct = await fetch("/api/credits/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1, description: "Content creation" }),
    });

    if (!deduct.ok) {
      setNoCredits(true);
      setLoading(false);
      return;
    }

    await refreshCredits();

    const prompt = MODULE_PROMPTS.content(buildUserContext(setup), researchOutput, setup.language);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: HILAS_KNOWLEDGE, module: "content" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Content generation failed.");

      const parsedPosts = parseContentPosts(data.content || "");
      if (parsedPosts.length !== 7 || parsedPosts.some((post) => !post.caption.trim())) {
        throw new Error("The content response was not a complete 7-post JSON array. Please try again.");
      }

      setPosts(parsedPosts);
      setContentOutput({
        posts: parsedPosts.map((post) => ({ ...post, language: setup.language })),
        language: setup.language,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyCaption(caption: string, index: number) {
    navigator.clipboard.writeText(caption);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1500);
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
            <p className="text-[#1c1e21] text-sm mb-6">Content creation costs 1 credit. Top up to continue.</p>
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

      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <FunnelProgress currentStep={5} />

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 rounded-full px-3 py-1 mb-4">
              <span className="text-blue-300 text-xs font-medium">Content Department</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1c1e21] mb-2">Generate Your Content Pack</h1>
            <p className="text-[#1c1e21] text-sm">
              7 ready-to-post captions based on your business and research.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={generateContent}
              disabled={loading}
              className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "#1877F2", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
            >
              {loading ? "Generating..." : posts.length > 0 ? "Regenerate Content Pack - 1 credit" : "Generate Content Pack - 1 credit"}
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

          <div
            className="rounded-2xl border p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            style={{
              background: isMax ? "#F5F3FF" : "#FFFFFF",
              borderColor: isMax ? "#DDD6FE" : "#E4E6EB",
            }}
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3" style={{ background: "#8B5CF615", color: "#8B5CF6", border: "1px solid #8B5CF640" }}>
                <span className="text-xs font-bold">{isMax ? "Coming Soon" : "Max Feature"}</span>
              </div>
              <h2 className="text-[#1c1e21] font-bold text-lg mb-1">Script Writing</h2>
              <p className="text-[#64748B] text-sm">Video scripts powered by AI. Coming soon for Max users.</p>
            </div>
            {!isMax && (
              <button
                onClick={() => router.push("/pricing")}
                className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
                style={{ background: "#8B5CF6" }}
              >
                Upgrade to Max
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
