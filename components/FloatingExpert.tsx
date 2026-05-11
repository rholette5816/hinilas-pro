"use client";

import { useState, useEffect } from "react";
import { useApp, derivePlan } from "@/lib/context";

const EXPERT_COST = 100;

const TIME_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
];

type Step = "open" | "confirm" | "success" | "no_credits";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingExpert({ isOpen, onClose }: Props) {
  const { credits, refreshCredits } = useApp();
  const plan = derivePlan(credits);
  const canBook = credits >= EXPERT_COST && plan !== "lite";

  const [step, setStep] = useState<Step>("open");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(canBook ? "open" : "no_credits");
      setTopic("");
      setDate("");
      setTime("");
    }
  }, [isOpen, canBook]);

  function close() {
    onClose();
  }

  async function confirmBooking() {
    if (!topic.trim() || !date || !time) return;
    setLoading(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, preferred_date: date, preferred_time: time }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NO_CREDITS") { setStep("no_credits"); return; }
        return;
      }
      setBookingRef(data.booking?.id?.slice(0, 8).toUpperCase() || "—");
      await refreshCredits();
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(248,250,252,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>

        {/* No credits state */}
        {step === "no_credits" && (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F1F5F9" }}>
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">Not Enough Credits</h3>
            <p className="text-slate-600 text-sm mb-1">Live consultation costs <span className="text-slate-900 font-semibold">100 credits</span>.</p>
            <p className="text-xs mb-6" style={{ color: "#64748B" }}>You have {credits} credits remaining. Top up to book a session.</p>
            <div className="flex gap-3">
              <button onClick={close} className="flex-1 py-2.5 rounded-xl text-sm" style={{ border: "1px solid #E2E8F0", color: "#64748B" }}>Cancel</button>
              <a href="/pricing#topup" onClick={close} className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold text-white" style={{ background: "#2B7EC9" }}>
                Get Credits
              </a>
            </div>
          </div>
        )}

        {/* Booking form */}
        {step === "open" && (
          <>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <div>
                <h3 className="text-slate-900 font-bold text-base">Book a Live Consultation</h3>
                <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>1-on-1 session with Ken · 100 credits</p>
              </div>
              <button onClick={close} className="text-slate-500 hover:text-slate-900 text-lg px-1">✕</button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748B" }}>What do you need help with?</label>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. My ads are spending but getting zero messages. CPM is P400+."
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748B" }}>Preferred Date</label>
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748B" }}>Preferred Time <span className="text-slate-500">(GMT+8)</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className="py-2 rounded-lg text-xs font-medium border transition-all"
                      style={time === t
                        ? { background: "#F5A623", borderColor: "#F5A623", color: "#000" }
                        : { background: "#F1F5F9", borderColor: "#E2E8F0", color: "#64748B" }
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <div>
                  <p className="text-amber-300 text-sm font-semibold">100 credits will be deducted</p>
                  <p className="text-amber-700 text-xs">You have {credits} credits · {credits - EXPERT_COST} remaining after</p>
                </div>
                <span className="text-amber-400 text-xl">⚡</span>
              </div>

              <button
                onClick={() => setStep("confirm")}
                disabled={!topic.trim() || !date || !time}
                className="w-full py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ background: "#F5A623", color: "#000" }}
              >
                Review Booking
              </button>
            </div>
          </>
        )}

        {/* Confirm step */}
        {step === "confirm" && (
          <>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <h3 className="text-slate-900 font-bold text-base">Confirm Booking</h3>
              <button onClick={() => setStep("open")} className="text-slate-500 hover:text-slate-900 text-xs">← Edit</button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div className="rounded-xl px-4 py-4 space-y-3" style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>
                <div>
                  <p className="text-xs" style={{ color: "#64748B" }}>Topic</p>
                  <p className="text-slate-900 text-sm mt-0.5">{topic}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs" style={{ color: "#64748B" }}>Date</p>
                    <p className="text-slate-900 text-sm mt-0.5">{date}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "#64748B" }}>Time</p>
                    <p className="text-slate-900 text-sm mt-0.5">{time} GMT+8</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#64748B" }}>Cost</p>
                  <p className="text-sm mt-0.5 font-semibold" style={{ color: "#F5A623" }}>100 credits</p>
                </div>
              </div>
              <p className="text-xs" style={{ color: "#64748B" }}>Ken will confirm your slot via the platform. Credits are deducted immediately upon booking.</p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("open")} className="flex-1 py-2.5 rounded-xl text-sm" style={{ border: "1px solid #E2E8F0", color: "#64748B" }}>Back</button>
                <button
                  onClick={confirmBooking}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: "#F5A623", color: "#000" }}
                >
                  {loading ? "Booking..." : "Confirm & Pay 20 Credits"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#DCFCE7" }}>
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">Booking Confirmed!</h3>
            <p className="text-slate-600 text-sm mb-1">Ref: <span className="text-slate-900 font-mono font-semibold">#{bookingRef}</span></p>
            <p className="text-xs mb-1" style={{ color: "#64748B" }}>{date} · {time} GMT+8</p>
            <p className="text-slate-600 text-xs mb-2">A <strong className="text-slate-900">Google Meet link</strong> will be sent to your email approximately <strong className="text-slate-900">1 hour before</strong> your session.</p>
            <p className="text-amber-600 text-xs mb-6">If you don&apos;t see it, please check your spam or junk folder.</p>
            <button onClick={close} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2B7EC9" }}>
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
