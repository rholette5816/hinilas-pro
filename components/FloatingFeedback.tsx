"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const STAR_REWARDS: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 8, 5: 15 };
const VIDEO_BONUS = 50;
const CATEGORIES = ["Feature Request", "Bug Report", "General Feedback"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingFeedback({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<"form" | "success" | "already_submitted">("form");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState("General Feedback");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(0);
  const [checking, setChecking] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [videoName, setVideoName] = useState("");
  const [error, setError] = useState("");
  const [improving, setImproving] = useState(false);
  const [improved, setImproved] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setRating(0);
      setHovered(0);
      setCategory("General Feedback");
      setMessage("");
      setCreditsAwarded(0);
      setVideo(null);
      setVideoName("");
      setError("");
      setImproving(false);
      setImproved(false);
      setPulsing(false);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      setChecking(true);
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) {
          setChecking(false);
          return;
        }
        const { data } = await supabase.from("feedbacks").select("id").eq("user_id", user.id).limit(1);
        if (data && data.length > 0) setStep("already_submitted");
        setChecking(false);
      });
    }
  }, [isOpen]);

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo(file);
    setVideoName(file.name);
  }

  async function uploadVideo(): Promise<string | null> {
    if (!video) return null;

    const supabase = createClient();
    const ext = video.name.split(".").pop() || "mp4";
    const fileName = `feedback-video-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("topup-receipts")
      .upload(fileName, video, { contentType: video.type });

    if (uploadError) {
      throw new Error("Video upload failed");
    }

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
    if (!message.trim() || rating === 0) return;
    setLoading(true);
    setError("");

    try {
      const videoUrl = await uploadVideo();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, category, message, videoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setCreditsAwarded(data.creditsAwarded || 0);
      setStep("success");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const baseReward = rating > 0 ? STAR_REWARDS[rating] : 0;
  const totalReward = baseReward + (video ? VIDEO_BONUS : 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-3"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 overflow-hidden" style={{ background: "#0F172A" }}>
        {checking && (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Loading...</div>
        )}

        {!checking && step === "already_submitted" && (
          <div className="px-6 py-8 text-center">
            <div className="text-3xl mb-3">⭐</div>
            <h3 className="text-white font-bold text-base mb-2">Already submitted</h3>
            <p className="text-gray-400 text-sm mb-4">You already used your one-time feedback reward.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2B7EC9" }}>
              Close
            </button>
          </div>
        )}

        {!checking && step === "form" && (
          <>
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">Send Feedback</h3>
                <p className="text-gray-500 text-xs">One-time reward. +50 for video.</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white text-base px-1">✕</button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Reward info — compact inline */}
              <div className="rounded-lg px-3 py-2 flex items-center justify-between" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className="text-center">
                      <p className="text-sm leading-none" style={{ color: s <= (hovered || rating) ? "#F5A623" : "#374151" }}>★</p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: s <= (hovered || rating) ? "#22c55e" : "#334155" }}>+{STAR_REWARDS[s]}</p>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "#052e16", color: "#22c55e", border: "1px solid #14532d" }}>+50 video</span>
              </div>

              {/* Stars */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">How satisfied are you?</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      className="text-xl transition-transform hover:scale-110"
                    >
                      <span style={{ color: star <= (hovered || rating) ? "#F5A623" : "#374151" }}>★</span>
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="text-xs font-semibold ml-1 self-center" style={{ color: "#22c55e" }}>+{totalReward} credits</span>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-400">Your feedback</label>
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
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{
                          background: "rgba(43,126,201,0.15)",
                          color: "#2B7EC9",
                          border: "1px solid rgba(43,126,201,0.3)",
                          animation: pulsing && !improving ? "polishPulse 2s ease-in-out infinite" : "none",
                        }}
                      >
                        {improving ? "Polishing..." : "✦ Polish with AI"}
                      </button>
                    </>
                  )}
                  {improved && (
                    <span className="text-[10px] font-semibold" style={{ color: "#22c55e" }}>✓ Polished</span>
                  )}
                </div>
                <textarea
                  value={message}
                  onChange={e => handleMessageChange(e.target.value)}
                  placeholder="What's working well? What can we improve?"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Video upload */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Optional video testimonial (+50 credits)</label>
                <input ref={fileRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                <input ref={cameraRef} type="file" accept="video/*" capture="user" onChange={handleVideoChange} className="hidden" />
                {video ? (
                  <div className="rounded-lg border border-gray-700 px-3 py-2 flex items-center justify-between" style={{ background: "#0A0F1A" }}>
                    <div className="min-w-0 mr-2">
                      <p className="text-white text-xs font-medium truncate">{videoName}</p>
                      <p className="text-emerald-400 text-[10px]">+50 credits included</p>
                    </div>
                    <button onClick={() => { setVideo(null); setVideoName(""); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remove</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 text-xs transition-colors"
                      style={{ background: "#0A0F1A" }}
                    >
                      <span>📁</span> Upload
                    </button>
                    <button
                      onClick={() => cameraRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 text-xs transition-colors"
                      style={{ background: "#0A0F1A" }}
                    >
                      <span>📷</span> Camera
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={submit}
                disabled={!message.trim() || rating === 0 || loading}
                className="w-full py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "#F5A623", color: "#000" }}
              >
                {loading ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </>
        )}

        {!checking && step === "success" && (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#14532D" }}>
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Thanks for the feedback!</h3>
            {creditsAwarded > 0 ? (
              <div className="rounded-xl border border-emerald-700 px-4 py-4 mb-4" style={{ background: "#052e16" }}>
                <div className="text-3xl font-black text-emerald-400 mb-1">+{creditsAwarded} Credits</div>
                <p className="text-emerald-300 text-sm font-semibold">Added to your account!</p>
                <p className="text-emerald-700 text-xs mt-1">Thank you for helping us improve Hinilas Pro.</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-4">We read every message. This helps us build a better tool for you.</p>
            )}
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2B7EC9" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
