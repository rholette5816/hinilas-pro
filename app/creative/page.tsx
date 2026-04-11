"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

type SizeKey = "1:1" | "9:16" | "1.91:1";

const EXTRA_SIZES: { key: SizeKey; label: string; sub: string; icon: string }[] = [
  { key: "9:16", label: "9:16 Vertical", sub: "Stories and Reels", icon: "▮" },
  { key: "1.91:1", label: "1.91:1 Banner", sub: "Banner ads", icon: "▬" },
];

export default function CreativePage() {
  const { setup, selectedAngle } = useApp();
  const router = useRouter();

  const [extraPrompt, setExtraPrompt] = useState("");
  const [images, setImages] = useState<Record<SizeKey, string>>({} as Record<SizeKey, string>);
  const [loading, setLoading] = useState<Record<SizeKey, boolean>>({} as Record<SizeKey, boolean>);
  const [error, setError] = useState("");

  async function generate(size: SizeKey) {
    if (!setup) return;
    setLoading(prev => ({ ...prev, [size]: true }));
    setError("");

    const userCtx = `${setup.businessName} — ${setup.product}`;
    const angle = selectedAngle || "Problem angle";
    const prompt = MODULE_PROMPTS.creative(userCtx, angle, "", "", "", size) +
      (extraPrompt.trim() ? `\n\nAdditional details: ${extraPrompt.trim()}` : "");

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: 1, aspectRatio: size }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.images?.[0]) {
        setImages(prev => ({ ...prev, [size]: data.images[0] }));
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(prev => ({ ...prev, [size]: false }));
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

  const mainGenerated = !!images["1:1"];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-pink-950 border border-pink-800 rounded-full px-3 py-1 mb-4">
              <span className="text-pink-300 text-xs font-medium">🖼 Creative</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Generate Ad Images</h1>
            <p className="text-gray-400 text-sm">AI generates your ad creative from your angle and business context.</p>
          </div>

          {/* Angle context */}
          {selectedAngle && (
            <div className="flex items-start gap-2 bg-orange-950 border border-orange-800 rounded-lg px-4 py-3 mb-5 text-sm">
              <span className="text-orange-400 mt-0.5">🎯</span>
              <div>
                <p className="text-orange-300 text-xs font-medium mb-0.5">Angle loaded</p>
                <p className="text-orange-200 text-xs line-clamp-2">{selectedAngle}</p>
              </div>
            </div>
          )}

          {/* Additional prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Additional details <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={extraPrompt}
              onChange={e => setExtraPrompt(e.target.value)}
              placeholder="e.g. dark themed, show product close-up, warm colors, lifestyle photo..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Main 1:1 image */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">1:1 Square</p>
                <p className="text-gray-500 text-xs">Feed ads</p>
              </div>
              <button
                onClick={() => generate("1:1")}
                disabled={loading["1:1"]}
                className="text-white px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: "#F5A623" }}
              >
                {loading["1:1"] ? "Generating..." : images["1:1"] ? "Regenerate" : "Generate Image"}
              </button>
            </div>

            {loading["1:1"] && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                <div className="flex justify-center gap-1 mb-3">
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-gray-400 text-sm">Generating your ad image...</p>
              </div>
            )}

            {images["1:1"] && !loading["1:1"] && (
              <div className="relative rounded-xl overflow-hidden border border-gray-700">
                <img src={images["1:1"]} alt="1:1 Ad creative" className="w-full object-cover" />
                <div className="absolute bottom-3 right-3">
                  <a
                    href={images["1:1"]}
                    download="hinilas-ad-1x1.png"
                    className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100 mr-2"
                  >
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Other sizes — only show after 1:1 is generated */}
          {mainGenerated && (
            <div className="space-y-6">
              <div className="border-t border-gray-700 pt-6">
                <p className="text-white font-semibold text-sm mb-1">Generate other sizes</p>
                <p className="text-gray-500 text-xs mb-5">Same concept, different formats. Each generates independently.</p>

                {EXTRA_SIZES.map(size => (
                  <div key={size.key} className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-semibold text-sm">{size.label}</p>
                        <p className="text-gray-500 text-xs">{size.sub}</p>
                      </div>
                      <button
                        onClick={() => generate(size.key)}
                        disabled={loading[size.key]}
                        className="text-white px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: "#2B7EC9" }}
                      >
                        {loading[size.key] ? "Generating..." : images[size.key] ? "Regenerate" : "Generate"}
                      </button>
                    </div>

                    {loading[size.key] && (
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                        <div className="flex justify-center gap-1 mb-3">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <p className="text-gray-400 text-sm">Generating {size.label}...</p>
                      </div>
                    )}

                    {images[size.key] && !loading[size.key] && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-700">
                        <img src={images[size.key]} alt={`${size.label} Ad creative`} className="w-full object-cover" />
                        <div className="absolute bottom-3 right-3">
                          <a
                            href={images[size.key]}
                            download={`hinilas-ad-${size.key.replace(":", "x")}.png`}
                            className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Next step */}
              <div className="pt-2">
                <button
                  onClick={() => router.push("/copy")}
                  className="text-white px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "#F5A623" }}
                >
                  Next: Write Ad Copy →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
