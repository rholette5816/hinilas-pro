"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type DashTab = "overview" | "tree";

type Gen2Member = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  active: boolean;
  total_paid: number;
};

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
  thisMonthEarnings: number;
  thisMonthOverride: number;
  thisMonthGen2Override: number;
  activeMembers: number;
  overrideRate: number;
  overrideActiveRequired: number;
  gen2Members: Record<string, Gen2Member[]>;
  gen2ActiveCount: number;
  gen2OverrideRate: number;
  earnings: Array<{ id: string; type: string; amount_earned: number; status: string; created_at: string; from_email: string }>;
  payouts: Array<{ id: string; amount: number; gcash_number: string; gcash_name: string; status: string; requested_at: string; paid_at: string | null }>;
  members: Array<{
    user_id: string;
    username?: string | null;
    avatar_url?: string | null;
    joined_at: string | null;
    total_paid: number;
    active: boolean;
    total_paid_referrals: number;
  }>;
};

const RANK_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Partner: { bg: "#F2F3F5", color: "#65676B", border: "#E4E6EB" },
  Hustler: { bg: "#E7F3FF", color: "#1877F2", border: "#BFDBFE" },
  Leader: { bg: "#FFF7ED", color: "#D97706", border: "#FED7AA" },
  Educator: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  "Top Leader": { bg: "#FEF2F2", color: "#EF4444", border: "#FECACA" },
};

const RANK_FLOORS: Record<string, number> = {
  Partner: 0,
  Hustler: 3,
  Leader: 10,
  Educator: 25,
  "Top Leader": 50,
};

function formatPhp(value: number | null | undefined) {
  return `PHP ${Math.round(value || 0).toLocaleString("en-PH")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function maskedGcash(number: string) {
  if (!number) return "N/A";
  return `${number.slice(0, 4)}***${number.slice(-4)}`;
}

function earningType(type: string) {
  if (type === "flex_sale") return { label: "Flex Sale", bg: "#DCFCE7", color: "#16A34A" };
  if (type === "override") return { label: "Override", bg: "#F5F3FF", color: "#7C3AED" };
  if (type === "override_gen2") return { label: "Gen 2 Override", bg: "#F5F3FF", color: "#7C3AED" };
  return { label: "Top-up", bg: "#E7F3FF", color: "#1877F2" };
}

function getRankLabel(referrals: number): string {
  if (referrals >= 50) return "Top Leader";
  if (referrals >= 25) return "Educator";
  if (referrals >= 10) return "Leader";
  if (referrals >= 3) return "Hustler";
  return "Partner";
}

function StatPanel({ title, value, sub, children }: { title: string; value: string; sub: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="text-2xl font-black text-[#1c1e21] mt-2">{value}</p>
      <p className="text-sm text-slate-600 mt-1">{sub}</p>
      {children}
    </section>
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
  const [dashTab, setDashTab] = useState<DashTab>("overview");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      if (!res.ok) throw new Error(data.error || "Failed to load partner dashboard");
      if (data.notAffiliate) {
        router.replace("/affiliate");
        return;
      }
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load partner dashboard");
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

  if (loading && !stats) {
    return (
      <main className="min-h-full pt-16 px-6 py-10">
        <div className="max-w-6xl mx-auto text-sm text-slate-600">Loading partner dashboard...</div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-full pt-16 px-6 py-10">
        <div className="max-w-6xl mx-auto rounded-xl px-5 py-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
          {error || "Partner dashboard unavailable."}
        </div>
      </main>
    );
  }

  const rankStyle = RANK_STYLES[stats.rank] || RANK_STYLES.Partner;
  const pendingPayout = stats.payouts.find(payout => payout.status === "requested");
  const directThisMonth = stats.earnings
    .filter(earning => ["flex_sale", "topup_direct"].includes(earning.type) && new Date(earning.created_at).getMonth() === new Date().getMonth() && new Date(earning.created_at).getFullYear() === new Date().getFullYear())
    .reduce((sum, earning) => sum + earning.amount_earned, 0);
  const directAllTime = stats.earnings
    .filter(earning => ["flex_sale", "topup_direct"].includes(earning.type))
    .reduce((sum, earning) => sum + earning.amount_earned, 0);
  const overrideAllTime = stats.earnings
    .filter(earning => earning.type === "override")
    .reduce((sum, earning) => sum + earning.amount_earned, 0);
  const totalGen2Members = Object.values(stats.gen2Members || {}).reduce((sum, members) => sum + members.length, 0);
  const rankFloor = RANK_FLOORS[stats.rank] ?? 0;
  const nextFloor = RANK_FLOORS[stats.nextRank.name] ?? 50;
  const progress = stats.nextRank.referralsNeeded === 0
    ? 100
    : Math.max(0, Math.min(100, ((stats.totalPaidReferrals - rankFloor) / Math.max(nextFloor - rankFloor, 1)) * 100));

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

  function toggleExpanded(userId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <main className="min-h-full pt-16 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-black" style={{ background: rankStyle.bg, color: rankStyle.color, border: `1px solid ${rankStyle.border}` }}>
                {stats.rank}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-[#1c1e21] mt-3">Partner Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">{stats.totalPaidReferrals} paid referrals</p>
            </div>
            <div className="w-full lg:w-[520px] space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Partner Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl px-4 py-3 text-sm truncate" style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#1c1e21" }}>
                    {referralLink || "No referral code found"}
                  </div>
                  <button onClick={copyReferralLink} className="px-4 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "#1877F2" }}>
                    {copyLabel}
                  </button>
                </div>
              </div>
              <Link href="/?recruiting=true" className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-black text-white" style={{ background: "#D97706" }}>
                Create Recruiting Content
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rank Progress</p>
              <h2 className="font-black text-[#1c1e21] mt-1">
                {stats.nextRank.referralsNeeded > 0 ? `${stats.nextRank.referralsNeeded} more paid referrals to ${stats.nextRank.name}` : "You've reached the top rank"}
              </h2>
            </div>
            <p className="text-sm font-black text-[#1c1e21]">{stats.totalPaidReferrals}/{stats.nextRank.referralsNeeded > 0 ? nextFloor : stats.totalPaidReferrals}</p>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#E4E6EB" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#1877F2" }} />
          </div>
        </section>

        <div className="flex gap-2">
          <button onClick={() => setDashTab("overview")} style={dashTab === "overview" ? { background: "#1877F2", color: "#fff" } : { background: "#F8FAFC", color: "#65676B", border: "1px solid #E4E6EB" }} className="px-4 py-2 rounded-xl text-sm font-bold">
            Overview
          </button>
          <button onClick={() => setDashTab("tree")} style={dashTab === "tree" ? { background: "#1877F2", color: "#fff" } : { background: "#F8FAFC", color: "#65676B", border: "1px solid #E4E6EB" }} className="px-4 py-2 rounded-xl text-sm font-bold">
            Family Tree
          </button>
        </div>

        {dashTab === "overview" && (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatPanel title="Direct Commissions" value={formatPhp(directThisMonth)} sub={`All time: ${formatPhp(directAllTime)}. From your ${stats.members.length} direct members.`} />
          <StatPanel
            title="Team Override"
            value={formatPhp(stats.thisMonthOverride)}
            sub={stats.overrideRate > 0 ? `All time: ${formatPhp(overrideAllTime)}. ${stats.activeMembers} active members - ${Math.round(stats.overrideRate * 100)}% override.` : "Unlocks at Leader rank (10 referrals)."}
          />
          <StatPanel title="Wallet" value={formatPhp(stats.pendingBalance)} sub={`On hold: ${formatPhp(stats.holdBalance)}. Paid out: ${formatPhp(stats.totalPaid)}.`}>
            <div className="mt-4">
              {pendingPayout ? (
                <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
                  Payout of {formatPhp(pendingPayout.amount)} is being processed.
                </div>
              ) : stats.pendingBalance >= 200 ? (
                <button onClick={requestPayout} disabled={requesting} className="w-full rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-60" style={{ background: "#16A34A" }}>
                  {requesting ? "Requesting..." : "Request Payout"}
                </button>
              ) : (
                <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#475569" }}>
                  {formatPhp(200 - stats.pendingBalance)} more needed to withdraw.
                </div>
              )}
            </div>
          </StatPanel>
        </div>

        {message && <p className="text-sm font-semibold text-[#16A34A]">{message}</p>}
        {error && <p className="text-sm font-semibold text-[#B91C1C]">{error}</p>}

        <section className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
            <h2 className="font-black text-[#1c1e21]">Your Team ({stats.members.length} members)</h2>
          </div>
          {stats.members.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">Wala ka pang team. I-share ang iyong Partner Link para magsimula.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#E4E6EB" }}>
              {stats.members.map(member => (
                <div key={member.user_id} className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {member.avatar_url ? (
                      <Image src={member.avatar_url} alt={member.username || "Member"} width={40} height={40} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "#1877F2" }}>
                        {(member.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1c1e21] truncate">{member.username || "User"}</p>
                      <p className="text-xs text-slate-500">Joined {formatDate(member.joined_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-full font-bold" style={{ background: member.active ? "#DCFCE7" : "#F2F3F5", color: member.active ? "#16A34A" : "#65676B" }}>
                      {member.active ? "Active" : "Inactive"}
                    </span>
                    <span className="px-3 py-1 rounded-full font-bold" style={{ background: "#F8FAFC", color: "#1c1e21", border: "1px solid #E4E6EB" }}>
                      Spent {formatPhp(member.total_paid)}
                    </span>
                    <span className="px-3 py-1 rounded-full font-bold" style={{ background: "#F8FAFC", color: "#1c1e21", border: "1px solid #E4E6EB" }}>
                      {member.total_paid_referrals} referrals
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
            <h2 className="font-black text-[#1c1e21]">Earnings History</h2>
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
                {stats.earnings.map(earning => {
                  const type = earningType(earning.type);
                  return (
                    <tr key={earning.id} style={{ borderTop: "1px solid #E4E6EB" }}>
                      <td className="px-4 py-3 text-slate-600">{formatDate(earning.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: type.bg, color: type.color }}>{type.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{earning.type.startsWith("override") ? "Team" : earning.from_email}</td>
                      <td className="px-4 py-3 text-[#16A34A] font-black">{formatPhp(earning.amount_earned)}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{earning.status}</td>
                    </tr>
                  );
                })}
                {stats.earnings.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No earnings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
            <h2 className="font-black text-[#1c1e21]">Payouts History</h2>
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
          </>
        )}

        {dashTab === "tree" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatPanel title="Gen 1 Members" value={String(stats.members.length)} sub="Direct members in your team." />
              <StatPanel title="Gen 2 Members" value={String(totalGen2Members)} sub="Members recruited by your direct team." />
              <StatPanel title="Active Gen 2" value={String(stats.gen2ActiveCount)} sub="Topped up in the last 30 days." />
              <StatPanel
                title="Est. Gen 2 Override"
                value={formatPhp(stats.thisMonthGen2Override)}
                sub={stats.gen2OverrideRate > 0 ? `${Math.round(stats.gen2OverrideRate * 100)}% of Gen 2 top-ups` : "Unlocks at Leader rank"}
              />
            </div>

            <section className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
                <h2 className="font-black text-[#1c1e21]">Family Tree</h2>
              </div>
              {stats.members.length === 0 ? (
                <div className="p-6 text-sm text-slate-600">Wala ka pang team. I-share ang iyong Partner Link para magsimula.</div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#E4E6EB" }}>
                  {stats.members.map(member => {
                    const memberGen2 = stats.gen2Members?.[member.user_id] || [];
                    const isExpanded = expanded.has(member.user_id);
                    const memberRank = getRankLabel(member.total_paid_referrals);
                    const memberRankStyle = RANK_STYLES[memberRank] || RANK_STYLES.Partner;

                    return (
                      <div key={member.user_id}>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(member.user_id)}
                          className="w-full px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {member.avatar_url ? (
                              <Image src={member.avatar_url} alt={member.username || "Member"} width={44} height={44} className="rounded-full object-cover" />
                            ) : (
                              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "#1877F2" }}>
                                {(member.username || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#1c1e21] truncate">{member.username || "User"}</p>
                              <p className="text-xs text-slate-500">Joined {formatDate(member.joined_at)}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-3 py-1 rounded-full font-bold" style={{ background: memberRankStyle.bg, color: memberRankStyle.color, border: `1px solid ${memberRankStyle.border}` }}>
                              {memberRank}
                            </span>
                            <span className="px-3 py-1 rounded-full font-bold" style={{ background: "#F8FAFC", color: "#1c1e21", border: "1px solid #E4E6EB" }}>
                              {member.total_paid_referrals} referrals
                            </span>
                            <span className="px-3 py-1 rounded-full font-bold" style={{ background: member.active ? "#DCFCE7" : "#F2F3F5", color: member.active ? "#16A34A" : "#65676B" }}>
                              {member.active ? "Active" : "Inactive"}
                            </span>
                            <span className="w-7 text-center text-slate-500">{memberGen2.length > 0 ? (isExpanded ? "^" : "v") : ""}</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="pb-4 pl-10 pr-5 md:pl-20 space-y-3">
                            {memberGen2.length === 0 ? (
                              <p className="text-sm text-slate-500">Walang team pa si {member.username || "User"}.</p>
                            ) : (
                              memberGen2.map(gen2 => (
                                <div key={gen2.user_id} className="rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ background: "#F8FAFC", border: "1px solid #E4E6EB" }}>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-slate-400 text-sm">-&gt;</span>
                                    {gen2.avatar_url ? (
                                      <Image src={gen2.avatar_url} alt={gen2.username || "Member"} width={34} height={34} className="rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#7C3AED" }}>
                                        {(gen2.username || "U").charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-bold text-[#1c1e21] truncate">{gen2.username || "User"}</p>
                                      <p className="text-xs text-slate-500">Joined {formatDate(gen2.joined_at)}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="px-3 py-1 rounded-full font-bold" style={{ background: gen2.active ? "#DCFCE7" : "#F2F3F5", color: gen2.active ? "#16A34A" : "#65676B" }}>
                                      {gen2.active ? "Active" : "Inactive"}
                                    </span>
                                    <span className="px-3 py-1 rounded-full font-bold" style={{ background: "#FFFFFF", color: "#1c1e21", border: "1px solid #E4E6EB" }}>
                                      Spent {formatPhp(gen2.total_paid)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
