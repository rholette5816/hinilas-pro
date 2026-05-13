"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BRAND_ORANGE = "#D97706";
const BRAND_BLUE = "#1877F2";

export default function AffiliateJoinPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [gcashNumber, setGcashNumber] = useState("");
  const [gcashName, setGcashName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/affiliate/stats", { cache: "no-store" })
      .then(async res => {
        if (res.status === 401) return null;
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data && !data.notAffiliate) router.replace("/affiliate/dashboard");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    fetch("/api/referral").then(r => r.json()).then(d => {
      if (d.referralCode) setReferralCode(d.referralCode);
    });
    return () => { cancelled = true; };
  }, [router]);

  function getReferralLink() {
    if (!referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/ref/${referralCode}`;
  }

  function copyLink() {
    navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcashNumber, gcashName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-full pt-16 px-6 py-10">
        <div className="max-w-5xl mx-auto text-sm text-slate-600">Checking partner status...</div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-full pt-16 px-6 py-10">
        <div className="max-w-xl mx-auto rounded-2xl p-8 text-center" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: "#DCFCE7", color: "#16A34A" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="text-2xl font-black text-[#1c1e21]">Partner account created</h1>
          <p className="text-sm text-slate-600 mt-2">Your GCash details are locked for payout safety.</p>
          <Link href="/affiliate/dashboard" className="inline-flex mt-6 px-5 py-3 rounded-xl text-sm font-bold text-white" style={{ background: BRAND_ORANGE }}>
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full pt-16 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND_ORANGE }}>Partner Program</p>
          <h1 className="text-3xl md:text-4xl font-black text-[#1c1e21]">Earn cash with Hinilas Pro</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">Build a team around Hinilas Pro. Earn direct commissions, monthly team overrides, and recruiting content support.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          <div className="space-y-5">
            <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
                <h2 className="font-bold text-[#1c1e21]">Stream 1 - Direct Commission</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "#E4E6EB" }}>
                {[
                  ["Someone pays Flex PHP 499", "PHP 250 cash"],
                  ["Someone tops up PHP 99", "PHP 20 cash"],
                  ["Someone tops up PHP 179", "PHP 36 cash"],
                  ["Someone tops up PHP 299", "PHP 60 cash"],
                ].map(([label, value]) => (
                  <div key={label} className="px-5 py-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[#1c1e21]">{label}</span>
                    <span className="text-sm font-bold text-right" style={{ color: BRAND_BLUE }}>{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
                <h2 className="font-bold text-[#1c1e21]">Stream 2 - Team Override</h2>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: "#F8FAFC" }}>
                    <tr>
                      {["Rank", "Gen 1 Override", "Gen 2 Override"].map(header => (
                        <th key={header} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Leader (10 refs)", "5% of direct team", "4% of their teams"],
                      ["Educator (25 refs)", "8% of direct team", "6% of their teams"],
                      ["Top Leader (50 refs)", "12% of direct team", "10% of their teams"],
                    ].map(([rank, gen1, gen2]) => (
                      <tr key={rank} style={{ borderTop: "1px solid #E4E6EB" }}>
                        <td className="px-5 py-4 font-black text-[#1c1e21]">{rank}</td>
                        <td className="px-5 py-4 font-bold" style={{ color: BRAND_ORANGE }}>{gen1}</td>
                        <td className="px-5 py-4 font-bold" style={{ color: BRAND_BLUE }}>{gen2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
                <h2 className="font-bold text-[#1c1e21]">Stream 3 - Recruiting Paths</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "#E4E6EB" }}>
                {[
                  ["Content Creation", "Gumawa ng TikTok/Reels gamit ang Hinilas Pro"],
                  ["Workshops", "Magturo ng Meta Ads. Gamitin ang tool bilang demo."],
                  ["Direct Recruit", "Personal invite sa mga kakilala mong may business"],
                ].map(([title, sub]) => (
                  <div key={title} className="p-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black mb-3" style={{ background: "#E7F3FF", color: BRAND_BLUE }}>
                      {title.charAt(0)}
                    </div>
                    <p className="text-sm font-black text-[#1c1e21]">{title}</p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{sub}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <h2 className="font-bold text-[#1c1e21]">Rank Ladder</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
                {[
                  ["Partner", "Start"],
                  ["Hustler", "3"],
                  ["Leader", "10"],
                  ["Educator", "25"],
                  ["Top Leader", "50"],
                ].map(([rank, req]) => (
                  <div key={rank} className="rounded-xl px-4 py-3" style={{ background: "#F8FAFC", border: "1px solid #E4E6EB" }}>
                    <p className="text-sm font-black text-[#1c1e21]">{rank}</p>
                    <p className="text-xs text-slate-500 mt-1">{req === "Start" ? "Start here" : `${req} paid referrals`}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            {referralCode && (
              <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Your Referral Link</p>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 rounded-xl px-3 py-2.5 text-sm truncate" style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#1c1e21" }}>
                    {getReferralLink()}
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white shrink-0"
                    style={{ background: BRAND_BLUE }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-xs text-amber-800 leading-relaxed">You can already share this link — pero para makatanggap ng payout, kailangan mo munang i-register ang iyong GCash number sa form sa ibaba.</p>
                </div>
              </div>
            )}

          <form onSubmit={handleSubmit} className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
            <h2 className="text-lg font-black text-[#1c1e21]">Join Partner Program</h2>
            <p className="text-sm text-slate-600 mt-1">Payouts go to this registered GCash account.</p>

            <label className="block mt-5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">GCash Number</span>
              <input
                value={gcashNumber}
                onChange={e => setGcashNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                inputMode="numeric"
                placeholder="09XXXXXXXXX"
                className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#1c1e21" }}
              />
            </label>

            <label className="block mt-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">GCash Name</span>
              <input
                value={gcashName}
                onChange={e => setGcashName(e.target.value)}
                placeholder="Full name on GCash"
                className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#1c1e21" }}
              />
            </label>

            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Your GCash number is used for payouts. Make sure it&apos;s correct because it cannot be changed without admin approval.
            </p>

            {error && (
              <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              style={{ background: BRAND_ORANGE }}
            >
              {submitting ? "Joining..." : "Join Partner Program"}
            </button>
          </form>
          </div>
        </div>
      </div>
    </main>
  );
}
