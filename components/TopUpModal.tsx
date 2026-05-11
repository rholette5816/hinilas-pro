"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const PACKAGES = [
  { id: "topup_50", label: "Top-Up", credits: 50, price: 499, tag: "50 credits", color: "#0866FF" },
  { id: "pro_150", label: "Flex", credits: 150, price: 999, tag: "150 credits", color: "#8B5CF6" },
  { id: "max_500", label: "Max", credits: 500, price: 2499, tag: "500 credits", color: "#D97706" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultPackage?: string;
}

export default function TopUpModal({ isOpen, onClose, defaultPackage }: Props) {
  const [selected, setSelected] = useState(PACKAGES[0]);
  const [step, setStep] = useState<"select" | "confirm" | "done">("select");
  const [refNumber, setRefNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const pkg = PACKAGES.find(p => p.id === defaultPackage) || PACKAGES[0];
      setSelected(pkg);
      setStep(defaultPackage ? "confirm" : "select");
      setRefNumber("");
      setScreenshot(null);
      setScreenshotPreview(null);
      setError("");
      setSubmitting(false);
      // Push a hash so browser back closes the modal
      window.history.pushState({ topup: true }, "", "#topup");
    }
  }, [isOpen, defaultPackage]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePop = () => onClose();
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isOpen, onClose]);

  // Clean up hash when modal closes
  useEffect(() => {
    if (!isOpen && window.location.hash === "#topup") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function reset() {
    setStep("select");
    setRefNumber("");
    setScreenshot(null);
    setScreenshotPreview(null);
    setError("");
    setSubmitting(false);
  }

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
      // Upload screenshot to Supabase Storage
      const supabase = createClient();
      const ext = screenshot.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("topup-receipts")
        .upload(fileName, screenshot, { contentType: screenshot.type });

      if (uploadError) throw new Error("Upload failed");

      const { data: urlData } = supabase.storage
        .from("topup-receipts")
        .getPublicUrl(fileName);

      const screenshotUrl = urlData.publicUrl;

      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: selected.label,
          referenceNumber: refNumber.trim(),
          amount: selected.price,
          credits: selected.credits,
          screenshotUrl,
        }),
      });
      if (!res.ok) throw new Error();
      setStep("done");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4" style={{ background: "rgba(248,250,252,0.85)", backdropFilter: "blur(8px)" }} onClick={e => { if (e.target === e.currentTarget) { reset(); onClose(); } }}>
      <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl overflow-y-auto max-h-[92vh] shadow-2xl" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-slate-900 font-bold text-sm">Top Up / Upgrade</p>
          <button onClick={() => { reset(); onClose(); }} className="text-slate-500 hover:text-slate-900 text-lg leading-none">✕</button>
        </div>

        {step === "select" && (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(pkg)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left"
                  style={{
                    background: selected.id === pkg.id ? `${pkg.color}12` : "#F1F5F9",
                    borderColor: selected.id === pkg.id ? pkg.color : "#E4E6EB",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selected.id === pkg.id ? pkg.color : "#64748B" }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold text-sm">{pkg.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${pkg.color}20`, color: pkg.color }}>{pkg.tag}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{pkg.credits} credits</span>
                    </div>
                  </div>
                  <span className="text-slate-900 font-bold text-sm">₱{pkg.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("confirm")}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: selected.color }}
            >
              Pay ₱{selected.price.toLocaleString()} via GCash
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="p-5 space-y-4">
            {/* GCash QR */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-blue-600 flex flex-col items-center py-5 px-4">
              <span className="text-slate-900 font-bold text-lg mb-4">GCash</span>
              <div className="bg-white rounded-xl p-3 mb-4">
                <img
                  src="/gcash-qr.jpg"
                  alt="GCash QR Code"
                  width={140}
                  height={140}
                  className="block"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
                  }}
                />
                <div style={{ display: "none", width: 140, height: 140 }} className="flex items-center justify-center bg-gray-100 rounded text-slate-600 text-xs text-center p-2">
                  QR not found
                </div>
              </div>
              <p className="text-blue-100 text-xs mb-1">Transfer fees may apply.</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-900 font-bold text-base">Donna Lim</p>
                <button onClick={() => navigator.clipboard.writeText("Donna Lim")} className="text-blue-200 hover:text-slate-900 text-xs px-2 py-0.5 rounded border border-blue-400 border-opacity-40 hover:border-opacity-80 transition-all">Copy</button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-blue-200 text-sm">0956 160 3751</p>
                <button onClick={() => navigator.clipboard.writeText("09561603751")} className="text-blue-200 hover:text-slate-900 text-xs px-2 py-0.5 rounded border border-blue-400 border-opacity-40 hover:border-opacity-80 transition-all">Copy</button>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#F1F5F9", border: "1px solid #E4E6EB" }}>
              <div>
                <p className="text-slate-900 font-bold text-sm">{selected.label} — {selected.credits} credits</p>
                <p className="text-slate-500 text-xs">{selected.tag}</p>
              </div>
              <p className="text-slate-900 font-bold">₱{selected.price.toLocaleString()}</p>
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Screenshot</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {screenshotPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-48 object-contain bg-slate-100" />
                  <button
                    onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg"
                    style={{ background: "#FFFFFF", color: "#1C1E21", border: "1px solid #E4E6EB" }}
                  >
                    Remove
                  </button>
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                style={{ border: "1px solid #E4E6EB" }}
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: selected.color }}
              >
                {submitting ? "Uploading..." : "Submit Request"}
              </button>
            </div>

            <p className="text-slate-500 text-xs text-center">Credits will be added after we verify your payment. Usually within a few hours.</p>
          </div>
        )}

        {step === "done" && (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: "#22c55e20" }}>
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-slate-900 font-bold text-base">Request Submitted</p>
            <p className="text-slate-600 text-sm">We received your top-up request for <strong className="text-slate-900">{selected.credits} credits</strong>. Credits will be added after payment is verified.</p>
            <p className="text-slate-500 text-xs">Usually within a few hours during business hours.</p>
            <button
              onClick={() => { reset(); onClose(); }}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0866FF" }}
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
