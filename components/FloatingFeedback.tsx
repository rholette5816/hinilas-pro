"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const STAR_REWARDS: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 8, 5: 15 };
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

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setRating(0);
      setHovered(0);
      setCategory("General Feedback");
      setMessage("");
      setChecking(true);
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) { setChecking(false); return; }
        const { data } = await supabase.from("feedbacks").select("id").eq("user_id", user.id).limit(1).single();
        if (data) setStep("already_submitted");
        setChecking(false);
      });
    }
  }, [isOpen]);

  async function submit() {
    if (!message.trim() || rating === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, category, message }),
      });
      const data = await res.json();
      setCreditsAwarded(data.creditsAwarded || 0);
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-700 overflow-hidden" style={{ background: "#0F172A" }}>

        {checking && (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Loading...</div>
        )}

        {!checking && step === "already_submitted" && (
          <div className="px-6 py-8 text-center">
            <div className="text-3xl mb-3">⭐</div>
            <h3 className="text-white font-bold text-base mb-2">Already submitted</h3>
            <p className="text-gray-400 text-sm mb-4">You&apos;ve already sent your feedback. Credits were awarded for your first submission.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2B7EC9" }}>Close</button>
          </div>
        )}

        {!checking && step === "form" && (
          <>
            <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Send Feedback</h3>
                <p className="text-gray-500 text-xs mt-0.5">Help us improve — earn credits for your review</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white text-lg px-1">✕</button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Star reward table */}
              <div className="rounded-xl p-3" style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Credits per rating — one-time reward</p>
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className="text-center">
                      <p className="text-base" style={{ color: s <= (hovered || rating) ? "#F5A623" : "#374151" }}>★</p>
                      <p className="text-[10px] font-bold" style={{ color: s <= (hovered || rating) ? "#22c55e" : "#334155" }}>+{STAR_REWARDS[s]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">How satisfied are you?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      className="text-2xl transition-transform hover:scale-110"
                    >
                      <span style={{ color: star <= (hovered || rating) ? "#F5A623" : "#374151" }}>★</span>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: "#22c55e" }}>You&apos;ll earn +{STAR_REWARDS[rating]} credits for this review</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Your feedback</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What can we improve? What&apos;s working well?"
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                onClick={submit}
                disabled={!message.trim() || rating === 0 || loading}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-opacity hover:opacity-90"
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
