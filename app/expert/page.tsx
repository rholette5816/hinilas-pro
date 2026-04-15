"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/lib/context";

const CONSULTATION_CREDIT_COST = 100;

const TOPICS = [
  "Meta Ads strategy & scaling",
  "Campaign structure & setup",
  "Creative review & feedback",
  "Low ROAS / poor results",
  "Product launch planning",
  "COD funnel optimization",
  "Other",
];

const TIME_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
];

export default function ExpertPage() {
  const { credits, plan, refreshCredits } = useApp();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [bookedDate, setBookedDate] = useState("");
  const [bookedTime, setBookedTime] = useState("");

  const canBook = credits >= CONSULTATION_CREDIT_COST && (plan === "flex" || plan === "max");
  const finalTopic = topic === "Other" ? customTopic : topic;

  const today = new Date().toISOString().split("T")[0];

  async function handleBook() {
    if (!finalTopic || !preferredDate || !preferredTime) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: finalTopic,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      setBookedDate(preferredDate);
      setBookedTime(preferredTime);
      await refreshCredits();
      setConfirmed(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmed) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="max-w-xl mx-auto px-6 py-16 text-center">
            <div className="text-5xl mb-6">✅</div>
            <h1 className="text-2xl font-bold text-white mb-3">Booking Confirmed!</h1>
            <p className="text-gray-400 text-sm mb-8">
              Your consultation has been submitted. Ken will review your request and send a <strong className="text-white">Google Meet link to your email</strong> approximately <strong className="text-white">1 hour before</strong> your scheduled time.
            </p>
            <div className="rounded-xl border border-gray-700 px-6 py-5 mb-8 text-left" style={{ background: "#1E293B" }}>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Booking Details</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Topic</span>
                  <span className="text-white text-sm font-medium">{finalTopic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Date</span>
                  <span className="text-white text-sm font-medium">{bookedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Time</span>
                  <span className="text-white text-sm font-medium">{bookedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Credits Used</span>
                  <span className="text-white text-sm font-medium">100 credits</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-amber-900 px-5 py-4 mb-8 text-left" style={{ background: "#1C1200" }}>
              <p className="text-amber-300 text-sm font-semibold mb-1">Check your email</p>
              <p className="text-amber-700 text-xs">The Google Meet link will be sent to your email about 1 hour before the session. If you don&apos;t see it, please check your spam or junk folder.</p>
            </div>
            <button
              onClick={() => router.push("/creative")}
              className="text-sm font-semibold px-6 py-3 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: "#2B7EC9" }}
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-950 border border-amber-800 rounded-full px-3 py-1 mb-4">
              <span className="text-amber-300 text-xs font-medium">🎙 Expert</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Book a Consultation</h1>
            <p className="text-gray-400 text-sm">Get a 1-on-1 live session with Ken. Direct strategy, no fluff.</p>
          </div>

          {/* Credit cost notice */}
          <div className="rounded-xl border border-amber-900 px-4 py-3 mb-6 flex items-center justify-between" style={{ background: "#1C1200" }}>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-lg">⚡</span>
              <div>
                <p className="text-amber-300 text-sm font-semibold">100 credits per session</p>
                <p className="text-amber-700 text-xs">You have {credits} credits remaining.</p>
              </div>
            </div>
            {!canBook && plan === "lite" && (
              <button
                onClick={() => router.push("/pricing")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#2B7EC9" }}
              >
                Upgrade
              </button>
            )}
            {!canBook && plan !== "lite" && credits < CONSULTATION_CREDIT_COST && (
              <button
                onClick={() => router.push("/pricing#topup")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#F5A623" }}
              >
                Get Credits
              </button>
            )}
          </div>

          {/* Form */}
          <div className="space-y-5">

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">What do you want to discuss?</label>
              <div className="grid grid-cols-1 gap-2">
                {TOPICS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    disabled={!canBook}
                    className={`text-left text-sm px-4 py-3 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${topic === t ? "border-amber-500 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"}`}
                    style={{ background: topic === t ? "#1C1200" : "#0F172A" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {topic === "Other" && (
                <input
                  type="text"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="Describe your topic..."
                  className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Date</label>
              <input
                type="date"
                value={preferredDate}
                min={today}
                onChange={e => setPreferredDate(e.target.value)}
                disabled={!canBook}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Time (GMT+8)</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => setPreferredTime(t)}
                    disabled={!canBook}
                    className={`text-sm px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${preferredTime === t ? "border-amber-500 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"}`}
                    style={{ background: preferredTime === t ? "#1C1200" : "#0F172A" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Submit */}
            <button
              onClick={handleBook}
              disabled={!canBook || loading || !finalTopic || !preferredDate || !preferredTime}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#F5A623", color: "#000" }}
            >
              {loading ? "Booking..." : "Confirm Booking — 100 Credits"}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}
