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
    return () => { cancelled = true; };
  }, [router]);

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
        <div className="max-w-5xl mx-auto text-sm text-slate-600">Checking affiliate status...</div>
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
          <h1 className="text-2xl font-black text-[#1c1e21]">Affiliate account created</h1>
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
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND_ORANGE }}>Affiliate Program</p>
          <h1 className="text-3xl md:text-4xl font-black text-[#1c1e21]">Earn cash with Hinilas Pro</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">Refer someone. Pag nagbayad sila PHP 499, PHP 250 agad sayo.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          <div className="space-y-5">
            <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
                <h2 className="font-bold text-[#1c1e21]">Commissions</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "#E4E6EB" }}>
                {[
                  ["Direct Flex sale", "PHP 250 flat plus rank bonus"],
                  ["Direct top-up", "20% of amount paid"],
                  ["Level 2 top-up", "10% of amount paid"],
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
                <h2 className="font-bold text-[#1c1e21]">Rank Bonuses</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "#E4E6EB" }}>
                {[
                  ["Starter", "0 referrals", "+PHP 0"],
                  ["Hustler", "5 referrals", "+PHP 25"],
                  ["Pro", "15 referrals", "+PHP 50"],
                  ["Elite", "30 referrals", "+PHP 75"],
                ].map(([rank, req, bonus]) => (
                  <div key={rank} className="p-5">
                    <p className="text-sm font-black text-[#1c1e21]">{rank}</p>
                    <p className="text-xs text-slate-500 mt-1">{req}</p>
                    <p className="text-sm font-bold mt-3" style={{ color: BRAND_ORANGE }}>{bonus} per Flex sale</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
            <h2 className="text-lg font-black text-[#1c1e21]">Join Affiliate Program</h2>
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
              {submitting ? "Joining..." : "Join Affiliate Program"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
