"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

export default function CreativePage() {
  const { setup, selectedAngle, setCreativeImage, credits, refreshCredits, savedImages, saveAdImages } = useApp();
  const router = useRouter();

  const [extraPrompt, setExtraPrompt] = useState("");
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [iterations, setIterations] = useState<(string | null)[]>([null, null]);

  // Load saved images on mount — always restore from context on page visit
  useEffect(() => {
    if (savedImages.main) setMainImage(savedImages.main);
    if (savedImages.v1 !== undefined || savedImages.v2 !== undefined) {
      setIterations([savedImages.v1 ?? null, savedImages.v2 ?? null]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingIter, setLoadingIter] = useState<boolean[]>([false, false]);
  const [error, setError] = useState("");
  const [noCredits, setNoCredits] = useState(false);

  const logoRef = useRef<HTMLInputElement>(null);
  const productRef = useRef<HTMLInputElement>(null);

  function applyForCopy(img: string) {
    setCreativeImage(img);
    router.push("/copy");
  }

  async function downloadImage(img: string, filename: string) {
    let blobUrl: string;
    if (img.startsWith("data:")) {
      const res = await fetch(img);
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
    } else {
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(img)}`);
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
    }
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, setter: (v: string | null) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function describeImage(base64: string, type: "logo" | "product"): Promise<string> {
    const prompt = type === "logo"
      ? `Describe this brand logo with extreme precision for ad design use:
- Exact colors (hex codes or very specific color names like 'deep crimson', 'electric blue', 'warm gold')
- Font style: weight (thin/regular/bold/black), type (serif/sans-serif/script/display), character (modern/classic/playful/premium/aggressive)
- Logo shape, icon elements, and layout structure
- Brand personality: luxury / mass market / clinical / fun / bold / trustworthy / youthful
- Any tagline or text present — spell it exactly as shown
- Overall graphic style: minimal, detailed, illustrative, geometric, organic`
      : `Describe this image for use as the hero element in a Meta ad:
- If product: exact shape, color, size, material, packaging details, and any text on the packaging spelled exactly
- If person or model: skin tone, expression, body language, outfit, and the mood or emotion they convey
- Key visual details that make this subject unique and instantly recognizable
- What emotion or feeling does this subject naturally communicate to a viewer?`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, images: [base64] }),
      });
      const data = await res.json();
      return data.content || "";
    } catch {
      return "";
    }
  }

  async function callImageAPI(prompt: string, referenceImage?: string, isVariation = false, variationIndex = 0): Promise<string | null> {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        count: 1,
        aspectRatio: isVariation ? (variationIndex === 0 ? "9:16" : "1.91:1") : "1:1",
        referenceImage,
        isVariation,
        variationIndex,
      }),
    });
    const data = await res.json();
    if (data.code === "NO_CREDITS") { setNoCredits(true); return null; }
    if (data.error) { setError(data.error); return null; }
    await refreshCredits();
    return data.images?.[0] || null;
  }

  async function generateMain() {
    if (!setup) return;
    if (!logoFile) { setError("Please upload your brand logo before generating."); return; }
    setLoadingMain(true);
    setError("");
    setNoCredits(false);
    try {
      const [logoDesc, productDesc] = await Promise.all([
        logoFile ? describeImage(logoFile, "logo") : Promise.resolve(""),
        productFile ? describeImage(productFile, "product") : Promise.resolve(""),
      ]);
      const userCtx = buildUserContext(setup);
      const angle = selectedAngle || "General product promotion";
      const prompt = MODULE_PROMPTS.creative(userCtx, angle, extraPrompt, logoDesc, productDesc, "1:1", setup.industry);
      const img = await callImageAPI(prompt);
      if (img) {
        setMainImage(img);
        setCreativeImage(img);
        setIterations([null, null]);
        await saveAdImages(img, null, null);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoadingMain(false);
    }
  }

  async function generateIteration(index: number) {
    if (!mainImage) return;
    setLoadingIter(prev => { const n = [...prev]; n[index] = true; return n; });
    setError("");
    setNoCredits(false);
    try {
      const img = await callImageAPI("", mainImage, true, index);
      if (img) {
        setIterations(prev => {
          const n = [...prev];
          n[index] = img;
          saveAdImages(mainImage, index === 0 ? img : n[0], index === 1 ? img : n[1]);
          return n;
        });
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoadingIter(prev => { const n = [...prev]; n[index] = false; return n; });
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
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-pink-950 border border-pink-800 rounded-full px-3 py-1 mb-4">
              <span className="text-pink-300 text-xs font-medium">🖼 Creative Department</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Generate Ad Images</h1>
            <p className="text-gray-400 text-sm">AI generates static ad creatives based on your angle and brand assets.</p>
          </div>

          {/* Angle context */}
          {selectedAngle && (
            <div className="flex items-start gap-2 bg-orange-950 border border-orange-800 rounded-lg px-4 py-3 mb-6 text-sm">
              <span className="text-orange-400 mt-0.5">🎯</span>
              <div>
                <p className="text-orange-300 text-xs font-medium mb-0.5">Angle loaded</p>
                <p className="text-orange-200 text-xs line-clamp-2">{selectedAngle}</p>
              </div>
            </div>
          )}

          {/* Brand assets */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Brand Logo <span className="text-red-400 font-normal text-xs">Required</span></p>
              <p className="text-gray-500 text-xs mb-1.5">Clean logo on white or transparent background. Sets your brand colors, fonts, and style.</p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, setLogoFile)} />
              {logoFile ? (
                <div className="bg-gray-800 border border-green-700 rounded-lg p-3 flex items-center gap-3">
                  <img src={logoFile} alt="Logo" className="w-10 h-10 object-contain rounded" />
                  <p className="text-gray-300 text-xs flex-1">Logo uploaded</p>
                  <button onClick={() => setLogoFile(null)} className="text-gray-500 hover:text-red-400 text-xs">Remove</button>
                </div>
              ) : (
                <button onClick={() => logoRef.current?.click()} className="w-full bg-gray-800 border border-dashed border-red-800 rounded-lg p-4 text-center hover:border-red-600 transition-colors">
                  <p className="text-gray-400 text-sm">Upload logo</p>
                  <p className="text-gray-600 text-xs mt-0.5">PNG, JPG</p>
                </button>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Product / Model <span className="text-gray-500 font-normal text-xs">(optional)</span></p>
              <p className="text-gray-500 text-xs mb-1.5">Upload your product photo or a photo of yourself / a model. The AI will feature it in the ad.</p>
              <input ref={productRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, setProductFile)} />
              {productFile ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
                  <img src={productFile} alt="Product" className="w-10 h-10 object-contain rounded" />
                  <p className="text-gray-300 text-xs flex-1">Photo uploaded</p>
                  <button onClick={() => setProductFile(null)} className="text-gray-500 hover:text-red-400 text-xs">Remove</button>
                </div>
              ) : (
                <button onClick={() => productRef.current?.click()} className="w-full bg-gray-800 border border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition-colors">
                  <p className="text-gray-400 text-sm">Upload product or model</p>
                  <p className="text-gray-600 text-xs mt-0.5">PNG, JPG</p>
                </button>
              )}
            </div>
          </div>

          {/* Additional prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Additional details <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={extraPrompt}
              onChange={e => setExtraPrompt(e.target.value)}
              placeholder="e.g. dark themed, warm colors, show before and after, minimalist design..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>

          {/* No credits modal */}
          {noCredits && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h2 className="text-white font-bold text-lg mb-2">You&apos;re out of credits</h2>
                <p className="text-gray-400 text-sm mb-6">Upgrade to Pro for 150 credits/month or grab a quick top-up to continue generating.</p>
                <div className="flex flex-col gap-3">
                  <a href="/pricing" className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center" style={{ background: "#F5A623" }}>
                    Upgrade to Flex — ₱499
                  </a>
                  <a href="/pricing#topup" className="w-full text-white py-3 rounded-lg text-sm font-semibold text-center" style={{ background: "#2B7EC9" }}>
                    Get 50 Credits — ₱249
                  </a>
                  <button onClick={() => setNoCredits(false)} className="text-gray-500 text-sm hover:text-gray-400">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Credits remaining */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-500">
              {credits === 1 ? "1 credit remaining" : `${credits} credits remaining`}
            </span>
            {credits <= 5 && (
              <a href="/pricing" className="text-xs text-orange-400 hover:text-orange-300 underline">Top up</a>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">{error}</div>
          )}

          {/* Main image */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">Ad Creative</p>
                <p className="text-gray-500 text-xs">1:1 — Feed</p>
              </div>
              <button
                onClick={generateMain}
                disabled={loadingMain}
                className="text-white px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: "#F5A623", animation: "btnGlowOrange 2s ease-in-out infinite alternate" }}
              >
                {loadingMain ? "Generating..." : mainImage ? "Regenerate — 2 credits" : "Generate Image — 2 credits"}
              </button>
            </div>

            {loadingMain && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                <div className="flex justify-center gap-1 mb-3">
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-gray-400 text-sm">Generating your ad image...</p>
                <p className="text-gray-600 text-xs mt-1">About 20 to 40 seconds</p>
              </div>
            )}

            {mainImage && !loadingMain && (
              <div className="relative rounded-xl overflow-hidden border border-gray-700">
                <img src={mainImage} alt="Ad creative" className="w-full object-cover" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <button
                    onClick={() => applyForCopy(mainImage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #ff6a00, #ee0979)", boxShadow: "0 0 12px #ff6a0080" }}
                  >
                    🔥 Use for Copy
                  </button>
                  <button onClick={() => downloadImage(mainImage, "hinilas-ad.png")} className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100">
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Iterations — only show after main is generated */}
          {mainImage && !loadingMain && (
            <div className="border-t border-gray-700 pt-6 mb-8">
              <p className="text-white font-semibold text-sm mb-1">Generate Variations</p>
              <p className="text-gray-500 text-xs mb-5">Different placements, different formats. Each uses 2 credits.</p>

              <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(i => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-gray-300 text-xs font-medium">Variation {i + 1}</p>
                      <button
                        onClick={() => generateIteration(i)}
                        disabled={loadingIter[i]}
                        className="text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: "#2B7EC9", animation: "btnGlowBlue 2s ease-in-out infinite alternate" }}
                      >
                        {loadingIter[i] ? "..." : iterations[i] ? "Regenerate — 2 credits" : "Generate — 2 credits"}
                      </button>
                    </div>

                    {loadingIter[i] && (
                      <div className="bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center aspect-square">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}

                    {iterations[i] && !loadingIter[i] && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-700">
                        <img src={iterations[i]!} alt={`Variation ${i + 2}`} className="w-full object-cover" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          <button
                            onClick={() => applyForCopy(iterations[i]!)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                            style={{ background: "linear-gradient(135deg, #ff6a00, #ee0979)", boxShadow: "0 0 10px #ff6a0070" }}
                          >
                            🔥 Use
                          </button>
                          <button onClick={() => downloadImage(iterations[i]!, `hinilas-ad-v${i + 2}.png`)} className="bg-white text-black px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-gray-100">
                            Download
                          </button>
                        </div>
                      </div>
                    )}

                    {!iterations[i] && !loadingIter[i] && (
                      <div className="bg-gray-800 border border-dashed border-gray-700 rounded-xl flex items-center justify-center aspect-square">
                        <p className="text-gray-600 text-xs">Not generated</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      </main>
    </div>
  );
}
