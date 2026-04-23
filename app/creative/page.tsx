"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

export default function CreativePage() {
  const { setup, selectedAngle, setCreativeImage, credits, refreshCredits, savedImages, saveAdImages, savedVideos, savedVideoPrompts, saveVideos } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"image" | "video">("image");

  // Video tab state
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<(string | null)[]>([null, null, null]);

  const [extraPrompt, setExtraPrompt] = useState("");
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [iterations, setIterations] = useState<(string | null)[]>([null, null]);

  // Load saved images and videos on mount
  useEffect(() => {
    if (savedImages.main) setMainImage(savedImages.main);
    if (savedImages.v1 !== undefined || savedImages.v2 !== undefined) {
      setIterations([savedImages.v1 ?? null, savedImages.v2 ?? null]);
    }
    if (savedVideos.v1 || savedVideos.v2 || savedVideos.v3) {
      setVideoUrls([savedVideos.v1 ?? null, savedVideos.v2 ?? null, savedVideos.v3 ?? null]);
    }
    if (savedVideoPrompts.length > 0) setVideoPrompts(savedVideoPrompts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingIter, setLoadingIter] = useState<boolean[]>([false, false]);
  const [error, setError] = useState("");
  const [noCredits, setNoCredits] = useState(false);

  const [playingsample, setPlayingSample] = useState<number | null>(null);
  const sampleRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);

  function toggleSample(index: number) {
    const video = sampleRefs.current[index];
    if (!video) return;
    if (playingsample === index) {
      video.pause();
      setPlayingSample(null);
    } else {
      sampleRefs.current.forEach((v, i) => { if (i !== index && v) { v.pause(); v.currentTime = 0; } });
      video.play();
      setPlayingSample(index);
    }
  }

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
        angle: selectedAngle || "",
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

  async function generateVideos() {
    if (!setup || !selectedAngle) return;
    setVideoLoading(true);
    setVideoError("");
    setVideoUrls([null, null, null]);
    try {
      const userCtx = buildUserContext(setup);

      // Step 1 — kick off generation, get operation names back immediately
      const res = await fetch("/api/video-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle: selectedAngle, userContext: userCtx, industry: setup.industry || "" }),
      });
      const data = await res.json();
      if (data.code === "NO_CREDITS") { setNoCredits(true); setVideoLoading(false); return; }
      if (data.error) { setVideoError(data.error); setVideoLoading(false); return; }

      const prompts: string[] = data.prompts || [];
      const operationNames: string[] = data.operationNames || [];
      const sessionTs = Date.now();
      setVideoPrompts(prompts);
      await refreshCredits();

      // Step 2 — poll for status every 5 seconds until all 3 clips are ready
      const resolvedUrls: (string | null)[] = [null, null, null];
      let attempts = 0;
      const maxAttempts = 72; // 6 minutes max (72 × 5s)

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setVideoError("Video generation timed out. Veo took too long — please try again.");
          setVideoLoading(false);
          return;
        }
        attempts++;

        // Send null for already-resolved indices so server skips them
        const pendingNames = operationNames.map((name: string, i: number) => resolvedUrls[i] ? null : name);

        try {
          const statusRes = await fetch("/api/video-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationNames: pendingNames, prompts, sessionTs, angle: selectedAngle }),
          });

          if (!statusRes.ok) {
            // Server error — retry
            setTimeout(poll, 5000);
            return;
          }

          const statusData = await statusRes.json();

          // Merge newly resolved URLs into state
          (statusData.videos as (string | null | "pending")[]).forEach((result, i) => {
            if (result && result !== "pending" && !resolvedUrls[i]) {
              resolvedUrls[i] = result as string;
            }
          });
          setVideoUrls([...resolvedUrls]);

          const allResolved = resolvedUrls.every(u => u !== null);
          if (statusData.allDone || allResolved) {
            await saveVideos(resolvedUrls, prompts);
            setVideoLoading(false);
          } else {
            setTimeout(poll, 5000);
          }
        } catch {
          setTimeout(poll, 5000); // retry on network error
        }
      };

      setTimeout(poll, 8000); // give Veo a head start before first check
    } catch {
      setVideoError("Something went wrong. Try again.");
      setVideoLoading(false);
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
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-pink-950 border border-pink-800 rounded-full px-3 py-1 mb-4">
              <span className="text-pink-300 text-xs font-medium">🖼 Creative Department</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ad Creatives</h1>
            <p className="text-gray-400 text-sm">Generate static images or short video clips for your Meta ads.</p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab("image")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "image" ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              🖼 Image
            </button>
            <button
              onClick={() => setActiveTab("video")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "video" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              🎬 Video Clips
            </button>
          </div>

          {/* === VIDEO TAB === */}
          {activeTab === "video" && (
            <div>
              {!selectedAngle ? (
                <div className="bg-orange-950 border border-orange-800 rounded-xl p-6 text-center mb-6">
                  <p className="text-orange-300 text-sm font-semibold mb-1">Angle required</p>
                  <p className="text-orange-400 text-xs mb-4">You need a marketing angle before generating video clips. Go to Angles first.</p>
                  <button onClick={() => router.push("/angles")} className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                    Go to Angles
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 bg-orange-950 border border-orange-800 rounded-lg px-4 py-3 mb-6 text-sm">
                    <span className="text-orange-400 mt-0.5">🎯</span>
                    <div>
                      <p className="text-orange-300 text-xs font-medium mb-0.5">Angle loaded</p>
                      <p className="text-orange-200 text-xs line-clamp-2">{selectedAngle}</p>
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
                    <p className="text-white text-sm font-semibold mb-1">3 Locked Video Clips</p>
                    <p className="text-gray-400 text-xs leading-relaxed">AI generates 3 short video prompts from your angle — all locked together in character, setting, and style. Clip 1 = hook, Clip 2 = solution, Clip 3 = CTA. Powered by Google Veo 3 Fast, 1080p 9:16 vertical format for Reels/Stories.</p>
                  </div>

                  {/* Sample previews */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 mb-5">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sample Output</p>
                      <p className="text-gray-600 text-xs">Tap to play</p>
                    </div>
                    <div className="flex gap-3">
                      {[
                        { label: "Hook", src: "/samples/clip-hook.mp4" },
                        { label: "Solution", src: "/samples/clip-solution.mp4" },
                        { label: "CTA", src: "/samples/clip-cta.mp4" },
                      ].map((s, i) => (
                        <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5">
                          <div
                            className="relative w-full rounded-lg overflow-hidden border border-gray-600 bg-gray-900 cursor-pointer"
                            style={{ aspectRatio: "9/16", maxHeight: "clamp(200px, 35vw, 320px)" }}
                            onClick={() => toggleSample(i)}
                          >
                            <video
                              ref={el => { sampleRefs.current[i] = el; }}
                              src={s.src}
                              loop
                              playsInline
                              className="w-full h-full object-cover"
                              onEnded={() => setPlayingSample(null)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors">
                              {playingsample === i ? (
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                                    <rect x="3" y="2" width="4" height="12" rx="1" />
                                    <rect x="9" y="2" width="4" height="12" rx="1" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                                    <path d="M4 2l10 6-10 6V2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-500 text-xs">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500">{credits} credits remaining</span>
                    {credits <= 70 && <a href="/pricing" className="text-xs text-orange-400 hover:text-orange-300 underline">Top up</a>}
                  </div>

                  {videoError && (
                    <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-5">{videoError}</div>
                  )}

                  <button
                    onClick={generateVideos}
                    disabled={videoLoading || credits < 70}
                    className="w-full text-white py-3 rounded-xl text-sm font-semibold mb-8 transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: videoLoading ? "#4B5563" : "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
                  >
                    {videoLoading ? "Generating videos... this takes up to 3 minutes" : "Generate 3 Video Clips — 70 credits"}
                  </button>

                  {videoLoading && !videoUrls.some(v => v !== null) && (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center mb-8">
                      <div className="flex justify-center gap-1 mb-3">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-gray-300 text-sm font-medium">Veo 2 is rendering your clips</p>
                      <p className="text-gray-500 text-xs mt-1">Video generation takes 1 to 3 minutes. Don&apos;t close this page.</p>
                    </div>
                  )}

                  {videoLoading && videoUrls.some(v => v !== null) && (
                    <div className="flex items-center gap-2 bg-purple-950 border border-purple-800 rounded-lg px-4 py-3 mb-5">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-purple-300 text-xs">Regenerating new clips — old ones shown below until ready. Don&apos;t close this page.</p>
                    </div>
                  )}

                  {videoUrls.some(v => v !== null) && (
                    <div className="flex flex-col gap-6">
                      {videoUrls.map((url, i) => (
                        <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                            <div>
                              <p className="text-white text-xs font-semibold">
                                {i === 0 ? "Clip 1 — Hook" : i === 1 ? "Clip 2 — Solution" : "Clip 3 — CTA"}
                              </p>
                              {videoPrompts[i] && (
                                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{videoPrompts[i]}</p>
                              )}
                            </div>
                            {url && (
                              <a
                                href={url}
                                download={`hinilas-clip-${i + 1}.mp4`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100 ml-3 shrink-0"
                              >
                                Download
                              </a>
                            )}
                          </div>
                          {url ? (
                            <video
                              src={url}
                              controls
                              className="w-full"
                              style={{ maxHeight: "480px", background: "#000" }}
                            />
                          ) : (
                            <div className="flex items-center justify-center py-10">
                              <p className="text-gray-600 text-xs">Generation failed for this clip</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* === IMAGE TAB === */}
          {activeTab === "image" && <>

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

            {loadingMain && !mainImage && (
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

            {loadingMain && mainImage && (
              <div className="flex items-center gap-2 bg-pink-950 border border-pink-800 rounded-lg px-4 py-3 mb-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-pink-300 text-xs">Regenerating — current image shown below until ready.</p>
              </div>
            )}

            {mainImage && (
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
          {mainImage && (
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

          </>}

        </div>
      </main>
    </div>
  );
}
