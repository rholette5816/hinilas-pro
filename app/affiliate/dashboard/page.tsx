"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type AffiliateStats = {
  notAffiliate?: boolean;
  affiliate?: { gcashNumber: string; gcashName: string; rank: string; status: string };
  referralCode: string | null;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
  holdBalance: number;
  rank: string;
  totalPaidReferrals: number;
  nextRank: { name: string; referralsNeeded: number };
  earnings: Array<{ id: string; type: string; amount_earned: number; status: string; created_at: string; from_email: string }>;
  payouts: Array<{ id: string; amount: number; gcash_number: string; gcash_name: string; status: string; requested_at: string; paid_at: string | null }>;
  members: Array<{ user_id: string; username?: string | null; avatar_url?: string | null; joined_at: string | null; total_paid: number }>;
};

const RANK_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Starter: { bg: "#F2F3F5", color: "#65676B", border: "#E4E6EB" },
  Hustler: { bg: "#E7F3FF", color: "#1877F2", border: "#BFDBFE" },
  Pro: { bg: "#FFF7ED", color: "#D97706", border: "#FED7AA" },
  Elite: { bg: "#FEF2F2", color: "#EF4444", border: "#FECACA" },
};

function formatPhp(value: number | null | undefined) {
  return `PHP ${Math.round(value || 0).toLocaleString("en-PH")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function earningType(type: string) {
  if (type === "flex_sale") return "Flex Sale";
  if (type === "topup_level2") return "Level 2";
  return "Top-up";
}

function maskedGcash(number: string) {
  if (!number) return "N/A";
  return `${number.slice(0, 4)}***${number.slice(-4)}`;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-2xl font-black mt-2" style={{ color: tone || "#1c1e21" }}>{value}</p>
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/stats", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        router.replace("/home");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to load affiliate dashboard");
      if (data.notAffiliate) {
        router.replace("/affiliate");
        return;
      }
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load affiliate dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const referralLink = useMemo(() => {
    if (!stats?.referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/ref/${stats.referralCode}`;
  }, [stats?.referralCode]);

  const pendingPayout = stats?.payouts.find(payout => payout.status === "requested");
  const rankStyle = stats ? RANK_STYLES[stats.rank] || RANK_STYLES.Starter : RANK_STYLES.Starter;

  async function copyReferralLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopyLabel("Copied");
    setTimeout(() => setCopyLabel("Copy"), 1200);
  }

  async function requestPayout() {
    setRequesting(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/affiliate/payout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request payout");
      setMessage("Payout request submitted.");
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request payout");
    } finally {
      setRequesting(false);
    }
  }

  if (loading && !stats) {
    return (
      <main className="min-h-full pt-16 px-6 py-10">
        <div className="max-w-6xl mx-auto text-sm text-slate-600">Loading affiliate dashboard...</div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-full pt-16 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl px-5 py-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
            {error || "Affiliate dashboard unavailable."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full pt-16 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-black" style={{ background: rankStyle.bg, color: rankStyle.color, border: `1px solid ${rankStyle.border}` }}>
                {stats.rank}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-[#1c1e21] mt-3">Affiliate Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">
                {stats.nextRank.referralsNeeded > 0 ? `${stats.nextRank.referralsNeeded} more paid referrals to ${stats.nextRank.name}` : "Top rank reached"}
              </p>
            </div>
            <div className="w-full md:w-[460px]">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Referral link</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl px-4 py-3 text-sm truncate" style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#1c1e21" }}>
                  {referralLink || "No referral code found"}
                </div>
                <button onClick={copyReferralLink} className="px-4 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "#1877F2" }}>
                  {copyLabel}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Earned" value={formatPhp(stats.totalEarned)} />
          <StatCard label="Available to Withdraw" value={formatPhp(stats.pendingBalance)} tone="#16A34A" />
          <StatCard label="On Hold (7 days)" value={formatPhp(stats.holdBalance)} tone="#D97706" />
          <StatCard label="Total Paid Out" value={formatPhp(stats.totalPaid)} tone="#1877F2" />
        </div>

        <section className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-black text-[#1c1e21]">Payout request</h2>
              <p className="text-sm text-slate-600 mt-1">Payouts are sent manually to {stats.affiliate?.gcashName} - {maskedGcash(stats.affiliate?.gcashNumber || "")}.</p>
            </div>
            {pendingPayout ? (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
                Payout of {formatPhp(pendingPayout.amount)} is being processed.
              </div>
            ) : stats.pendingBalance >= 200 ? (
              <button
                onClick={requestPayout}
                disabled={requesting}
                className="rounded-xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                style={{ background: "#D97706" }}
              >
                {requesting ? "Requesting..." : `Request Payout - ${formatPhp(stats.pendingBalance)}`}
              </button>
            ) : (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#475569" }}>
                Minimum PHP 200 to withdraw. {formatPhp(200 - stats.pendingBalance)} more to go.
              </div>
            )}
          </div>
          {message && <p className="mt-3 text-sm font-semibold text-[#16A34A]">{message}</p>}
          {error && <p className="mt-3 text-sm font-semibold text-[#B91C1C]">{error}</p>}
        </section>

        <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
            <h2 className="font-black text-[#1c1e21]">Members</h2>
          </div>
          {stats.members.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No members yet. Share your referral link to start earning.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#E4E6EB" }}>
              {stats.members.map(member => (
                <div key={member.user_id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt={member.username || "Member"} width={36} height={36} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "#1877F2" }}>
                        {(member.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1c1e21] truncate">{member.username || "User"}</p>
                      <p className="text-xs text-slate-500">Joined {formatDate(member.joined_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-[#16A34A] shrink-0">{formatPhp(member.total_paid)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
            <h2 className="font-black text-[#1c1e21]">Earnings history</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "#F8FAFC" }}>
                <tr>
                  {["Date", "Type", "From", "Amount", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.earnings.map(earning => (
                  <tr key={earning.id} style={{ borderTop: "1px solid #E4E6EB" }}>
                    <td className="px-4 py-3 text-slate-600">{formatDate(earning.created_at)}</td>
                    <td className="px-4 py-3 text-[#1c1e21] font-semibold">{earningType(earning.type)}</td>
                    <td className="px-4 py-3 text-slate-600">{earning.from_email}</td>
                    <td className="px-4 py-3 text-[#16A34A] font-black">{formatPhp(earning.amount_earned)}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{earning.status}</td>
                  </tr>
                ))}
                {stats.earnings.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No earnings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "#E4E6EB" }}>
            <h2 className="font-black text-[#1c1e21]">Payouts history</h2>
            <Link href="/affiliate" className="text-xs font-bold text-[#1877F2]">Program terms</Link>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "#F8FAFC" }}>
                <tr>
                  {["Date", "Amount", "GCash", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.payouts.map(payout => (
                  <tr key={payout.id} style={{ borderTop: "1px solid #E4E6EB" }}>
                    <td className="px-4 py-3 text-slate-600">{formatDate(payout.requested_at)}</td>
                    <td className="px-4 py-3 text-[#1c1e21] font-black">{formatPhp(payout.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{maskedGcash(payout.gcash_number)}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{payout.status}</td>
                  </tr>
                ))}
                {stats.payouts.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No payout requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
