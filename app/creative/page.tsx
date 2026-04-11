"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

const FORMATS = [
  { value: "1024x1024", label: "1:1 Square", sub: "Feed ads", icon: "⬛" },
  { value: "1024x1792", label: "9:16 Vertical", sub: "Stories & Reels", icon: "▮" },
  { value: "1792x1024", label: "1.91:1 Landscape", sub: "Banner ads", icon: "▬" },
];

export default function CreativePage() {
  const { setup, selectedAngle } = useApp();
  const router = useRouter();

  const [hook, setHook] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [cta, setCta] = useState("Message Us Now");
  const [format, setFormat] = useState("1024x1024");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateImages() {
    if (!setup || !hook.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);

    const userCtx = `${setup.businessName} — ${setup.product}`;
    const prompt = MODULE_PROMPTS.creative(userCtx, selectedAngle || "Problem angle", hook, subheadline, cta, format);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: 5 }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setImages(data.images);
      }
    } catch {
      setError("Something went wrong. Try again.");
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
            <div className="inline-flex items-center gap-2 bg-pink-950 border border-pink-800 rounded-full px-3 py-1 mb-4">
              <span className="text-pink-300 text-xs font-medium">🖼 Creative</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Generate Ad Images</h1>
            <p className="text-gray-400 text-sm">Your image stops the scroll. Fill in the details and get 5 ready-to-use ad creatives.</p>
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

          {/* Form */}
          <div className="space-y-5 mb-6">
            {/* Hook */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Hook Text <span className="text-gray-500 font-normal">(main headline on the image)</span>
              </label>
              <input
                type="text"
                value={hook}
                onChange={e => setHook(e.target.value)}
                placeholder='e.g. "Still struggling with acne?" or "5 customers in 3 days"'
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Sub-headline */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Sub-headline <span className="text-gray-500 font-normal">(supports the hook)</span>
              </label>
              <input
                type="text"
                value={subheadline}
                onChange={e => setSubheadline(e.target.value)}
                placeholder='e.g. "Gentle formula for clear skin in 7 days"'
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Call to Action</label>
              <div className="flex gap-2 flex-wrap">
                {["Message Us Now", "Order Now", "Shop Now", "Learn More", "I-message Ko"].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCta(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      cta === c
                        ? "bg-pink-600 border-pink-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ad Format</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMATS.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      format === f.value
                        ? "bg-pink-600 border-pink-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <p className="text-lg mb-1">{f.icon}</p>
                    <p className="text-xs font-medium">{f.label}</p>
                    <p className="text-xs opacity-70">{f.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generateImages}
            disabled={loading || !hook.trim()}
            className="w-full text-white py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 mb-6" style={{ background: "#F5A623" }}
          >
            {loading ? "Generating 5 images..." : "Generate 5 Ad Images"}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <div className="flex justify-center gap-1 mb-4">
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-gray-400 text-sm">Generating your ad images with GPT-image-1...</p>
              <p className="text-gray-600 text-xs mt-1">This takes about 30–60 seconds</p>
            </div>
          )}

          {/* Image grid */}
          {images.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                {images.length} Ad Images Generated
              </p>
              <div className="grid grid-cols-2 gap-4">
                {images.map((src, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-gray-700">
                    <img src={src} alt={`Ad creative ${i + 1}`} className="w-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <a
                        href={src}
                        download={`hinilas-ad-${i + 1}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-black px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-100"
                      >
                        Download
                      </a>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-0.5">
                      <p className="text-white text-xs">Ad {i + 1}</p>
                    </div>
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
