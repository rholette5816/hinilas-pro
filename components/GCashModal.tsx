"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  credits: number;
  price: number;
  color: string;
}

export default function GCashModal({ isOpen, onClose, label, credits, price, color }: Props) {
  const [refNumber, setRefNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRefNumber("");
      setScreenshot(null);
      setScreenshotPreview(null);
      setError("");
      setSubmitting(false);
      setDone(false);
      window.history.pushState({ gcash: true }, "", "#pay");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePop = () => onClose();
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen && window.location.hash === "#pay") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!screenshot) { setError("Upload a screenshot of your payment."); return; }
    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();
      const ext = screenshot.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("topup-receipts")
        .upload(fileName, screenshot, { contentType: screenshot.type });
      if (uploadError) throw new Error("Upload failed");
      const { data: urlData } = supabase.storage.from("topup-receipts").getPublicUrl(fileName);
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: label,
          referenceNumber: refNumber.trim(),
          amount: price,
          credits,
          screenshotUrl: urlData.publicUrl,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4"
      style={{ background: "rgba(248,250,252,0.85)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl overflow-y-auto max-h-[92vh] shadow-2xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <p className="text-slate-900 font-bold text-sm">Pay via GCash</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color }}>{label} — {credits} credits · ₱{price.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-lg leading-none">✕</button>
        </div>

        {!done ? (
          <div className="p-5 space-y-4">
            {/* GCash QR */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-blue-600 flex flex-col items-center py-5 px-4">
              <span className="text-slate-900 font-bold text-lg mb-4">GCash</span>
              <div className="bg-white rounded-xl p-3 mb-4">
                <img
                  src="/gcash-qr.jpg"
                  alt="GCash QR Code"
                  width={160}
                  height={160}
                  className="block"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-900 font-bold text-base">Donna Lim</p>
                <button
                  onClick={() => navigator.clipboard.writeText("Donna Lim")}
                  className="text-blue-200 hover:text-slate-900 text-xs px-2 py-0.5 rounded border border-blue-400/40 hover:border-blue-400/80 transition-all"
                >Copy</button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-blue-200 text-sm">0956 160 3751</p>
                <button
                  onClick={() => navigator.clipboard.writeText("09561603751")}
                  className="text-blue-200 hover:text-slate-900 text-xs px-2 py-0.5 rounded border border-blue-400/40 hover:border-blue-400/80 transition-all"
                >Copy</button>
              </div>
              <p className="text-blue-100 text-xs mt-3">Transfer fees may apply.</p>
            </div>

            {/* Amount summary */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#F1F5F9", border: "1px solid #E2E8F0" }}>
              <div>
                <p className="text-slate-900 font-bold text-sm">{label} — {credits} credits</p>
                <p className="text-slate-500 text-xs">Never expires · adds to balance</p>
              </div>
              <p className="text-slate-900 font-bold">₱{price.toLocaleString()}</p>
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Screenshot</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {screenshotPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-48 object-contain bg-slate-100" />
                  <button
                    onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg"
                    style={{ background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0" }}
                  >Remove</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-4 rounded-xl border border-dashed text-slate-600 hover:text-slate-900 text-sm transition-colors flex flex-col items-center gap-1"
                  style={{ background: "#F1F5F9" }}
                >
                  <span className="text-2xl">📎</span>
                  <span>Tap to upload screenshot</span>
                </button>
              )}
              {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: color }}
            >
              {submitting ? "Uploading..." : "Submit Payment"}
            </button>

            <p className="text-slate-500 text-xs text-center">Credits added after we verify your payment. Usually within a few hours.</p>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: "#22c55e20" }}>
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-slate-900 font-bold text-base">Request Submitted</p>
            <p className="text-slate-600 text-sm">We received your payment for <strong className="text-slate-900">{credits} credits</strong>. Credits will be added after verification.</p>
            <p className="text-slate-500 text-xs">Usually within a few hours during business hours.</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#1E3A8A" }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
