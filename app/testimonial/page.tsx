"use client";

import { useState, useRef } from "react";
import { HinilasIcon } from "@/components/HinilasLogo";

const BRAND_BLUE = "#2B7EC9";
const BRAND_ORANGE = "#F5A623";

const STAR_REWARDS: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 8, 5: 15 };

const VIDEO_GUIDE = [
  "Introduce yourself — your name",
  "Your brand or what you sell",
  "How Hinilas Pro helped you",
  "Your message of recommendation",
];

export default function TestimonialPage() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improved, setImproved] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(file);
    setMediaName(file.name);
    setIsVideo(file.type.startsWith("video/"));
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  }

  async function uploadMedia(): Promise<string | null> {
    if (!media) return null;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const ext = media.name.split(".").pop() || "mp4";
    const fileName = `testimonial-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("topup-receipts")
      .upload(fileName, media, { contentType: media.type });
    if (uploadError) throw new Error("Upload failed");
    const { data } = supabase.storage.from("topup-receipts").getPublicUrl(fileName);
    return data.publicUrl;
  }

  function handleMessageChange(val: string) {
    setMessage(val);
    if (improved) return;
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setPulsing(false);
    if (val.trim()) {
      pulseTimerRef.current = setTimeout(() => setPulsing(true), 1000);
    }
  }

  async function improveFeedback() {
    if (!message.trim() || improving || improved) return;
    setImproving(true);
    setPulsing(false);
    try {
      const res = await fetch("/api/improve-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.improved) {
        setMessage(data.improved);
        setImproved(true);
      }
    } catch {
      // silently fail
    } finally {
      setImproving(false);
    }
  }

  async function submit() {
    if (!name.trim() || !message.trim() || rating === 0) return;
    setLoading(true);
    setError("");
    try {
      const mediaUrl = await uploadMedia();
      const res = await fetch("/api/testimonial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, message, mediaUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#0B1120" }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#14532D" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-white font-bold text-2xl mb-2">Thank you!</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
            Your experience has been submitted. It means a lot and helps others discover what Hinilas Pro can do.
          </p>
          <p className="text-xs mt-4 font-semibold" style={{ color: BRAND_BLUE }}>— Basta Mag Ads Hilas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "#0B1120" }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <HinilasIcon size="lg" accentColor={BRAND_ORANGE} />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Share Your Experience</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Your story helps other business owners find the right tool.</p>
        </div>

        <div className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Your Name</label>
            <input
              type="text"
              placeholder="e.g. Maria Santos"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
              style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
              onFocus={e => e.target.style.borderColor = BRAND_BLUE}
              onBlur={e => e.target.style.borderColor = "#1E2D45"}
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#94A3B8" }}>Your Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-3xl transition-transform hover:scale-110"
                >
                  <span style={{ color: star <= (hovered || rating) ? BRAND_ORANGE : "#1E2D45" }}>★</span>
                </button>
              ))}
              {rating > 0 && (
                <span className="text-xs font-semibold self-center ml-1" style={{ color: "#22c55e" }}>
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#94A3B8" }}>Your Message</label>
              {message.trim() && !improved && (
                <>
                  <style>{`
                    @keyframes polishPulse {
                      0%, 100% { box-shadow: 0 0 0 0 rgba(43,126,201,0.5); }
                      50% { box-shadow: 0 0 0 6px rgba(43,126,201,0); }
                    }
                  `}</style>
                  <button
                    type="button"
                    onClick={improveFeedback}
                    disabled={improving}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{
                      background: "rgba(43,126,201,0.15)",
                      color: BRAND_BLUE,
                      border: "1px solid rgba(43,126,201,0.3)",
                      animation: pulsing && !improving ? "polishPulse 2s ease-in-out infinite" : "none",
                    }}
                  >
                    {improving ? "Polishing..." : "✦ Polish with AI"}
                  </button>
                </>
              )}
              {improved && (
                <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>✓ Polished</span>
              )}
            </div>
            <textarea
              rows={4}
              placeholder="Tell us about your experience with Hinilas Pro..."
              value={message}
              onChange={e => handleMessageChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none resize-none transition-all"
              style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
              onFocus={e => e.target.style.borderColor = BRAND_BLUE}
              onBlur={e => e.target.style.borderColor = "#1E2D45"}
            />
          </div>

          {/* Video / Image Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#94A3B8" }}>Video or Image</label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "rgba(245,166,35,0.1)", color: BRAND_ORANGE, border: `1px solid ${BRAND_ORANGE}30` }}>Highly Encouraged</span>
            </div>

            {/* Video guide */}
            <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#475569" }}>If recording a video, cover these points:</p>
              <ul className="space-y-1.5">
                {VIDEO_GUIDE.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#94A3B8" }}>
                    <span className="font-bold shrink-0" style={{ color: BRAND_BLUE }}>{i + 1}.</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <input ref={fileRef} type="file" accept="video/*,image/*" onChange={handleMediaChange} className="hidden" />
            <input ref={cameraRef} type="file" accept="video/*,image/*" capture="environment" onChange={handleMediaChange} className="hidden" />

            {media ? (
              <div className="rounded-xl border border-gray-700 overflow-hidden" style={{ background: "#0F172A" }}>
                {isVideo ? (
                  <video src={mediaPreview!} controls className="w-full max-h-48 object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreview!} alt="Preview" className="w-full max-h-48 object-cover" />
                )}
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs text-white truncate mr-2">{mediaName}</p>
                  <button
                    onClick={() => { setMedia(null); setMediaName(""); setMediaPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-xs shrink-0 hover:opacity-80"
                    style={{ color: "#EF4444" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed transition-colors hover:border-gray-400"
                  style={{ background: "#0F172A", borderColor: "#1E2D45" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span className="text-xs font-medium" style={{ color: "#64748B" }}>Upload File</span>
                </button>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-dashed transition-colors hover:border-gray-400"
                  style={{ background: "#0F172A", borderColor: "#1E2D45" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span className="text-xs font-medium" style={{ color: "#64748B" }}>Use Camera</span>
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}

          <button
            onClick={submit}
            disabled={!name.trim() || !message.trim() || rating === 0 || loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: BRAND_ORANGE, color: "#000" }}
          >
            {loading ? "Submitting..." : "Submit Testimonial"}
          </button>

          <p className="text-center text-xs" style={{ color: "#334155" }}>
            Your testimonial may be featured on the Hinilas Pro homepage.
          </p>

        </div>
      </div>
    </div>
  );
}
