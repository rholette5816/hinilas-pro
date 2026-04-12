"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = ["Feature Request", "Bug Report", "General Feedback"];

type Step = "idle" | "open" | "success";

export default function FloatingFeedback() {
  const [step, setStep] = useState<Step>("idle");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState("General Feedback");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function close() {
    setStep("idle");
    setRating(0);
    setHovered(0);
    setCategory("General Feedback");
    setMessage("");
  }

  async function submit() {
    if (!message.trim() || rating === 0) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          category,
          message,
          userEmail: user?.email || "Unknown",
        }),
      });
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setStep("open")}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#1E293B", border: "1px solid #374151", color: "#9CA3AF" }}
        aria-label="Send feedback"
      >
        <span>💬</span>
        <span>Feedback</span>
      </button>

      {/* Modal */}
      {step !== "idle" && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 overflow-hidden" style={{ background: "#0F172A" }}>

            {step === "open" && (
              <>
                <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-base">Send Feedback</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Help us improve Hinilas Pro</p>
                  </div>
                  <button onClick={close} className="text-gray-500 hover:text-white text-lg px-1">✕</button>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {/* Star rating */}
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
                  </div>

                  {/* Category */}
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

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Your feedback</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="What can we improve? What's working well?"
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

            {step === "success" && (
              <div className="px-6 py-8 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#14532D" }}>
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Thanks for the feedback!</h3>
                <p className="text-gray-400 text-sm mb-6">We read every message. This helps us build a better tool for you.</p>
                <button onClick={close} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2B7EC9" }}>
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
