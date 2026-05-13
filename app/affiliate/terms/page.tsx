"use client";

import Link from "next/link";

const BRAND_ORANGE = "#D97706";

const SECTIONS = [
  {
    title: "Eligibility",
    items: [
      "Must be a registered Hinilas Pro user with a paid Flex account.",
      "Must register a valid GCash number to receive payouts.",
      "One GCash number per account — cannot be shared or changed without admin approval.",
      "Must be 18 years old and based in the Philippines.",
    ],
  },
  {
    title: "How You Earn",
    items: [
      "₱250 cash for every Flex sign-up (₱499) through your referral link.",
      "20% of every top-up from your direct members.",
      "10% of every top-up from your members' referrals (Level 2).",
      "Monthly team override for Leader rank and above — paid on the 1st of the following month.",
      "Gen 2 override for Leader rank and above — based on your direct members' teams' monthly top-ups.",
    ],
  },
  {
    title: "Payouts",
    items: [
      "Minimum payout: ₱200.",
      "Payout method: GCash only.",
      "7-day hold on all earnings before they become withdrawable (anti-fraud protection).",
      "Payouts are processed manually — expect 1–3 business days after request.",
      "You will be notified via email when your payout is sent.",
    ],
  },
  {
    title: "Override Eligibility",
    items: [
      "Override is calculated based on the previous calendar month's team activity.",
      "You must meet the minimum active member requirement for your rank to qualify.",
      "Active member = someone who topped up within the last 30 days.",
      "Override is forfeited for that month if your active member count falls below the requirement.",
    ],
  },
  {
    title: "Rank Requirements",
    items: [
      "Partner — starting rank, no override.",
      "Hustler — 3 paid referrals, no override.",
      "Leader — 10 paid referrals, 5% Gen 1 override + 4% Gen 2 override (requires 5 active members).",
      "Educator — 25 paid referrals, 8% Gen 1 override + 6% Gen 2 override (requires 10 active members).",
      "Top Leader — 50 paid referrals, 12% Gen 1 override + 10% Gen 2 override (requires 20 active members).",
    ],
  },
  {
    title: "Prohibited",
    items: [
      "Spamming, fake accounts, or self-referrals.",
      "Misrepresenting Hinilas Pro's features or pricing to recruits.",
      "Using your referral link on paid ads without written approval from Ken.",
      "Creating multiple accounts to game commissions.",
      "Promising income guarantees to your recruits — earnings depend on effort and team activity.",
    ],
  },
  {
    title: "Termination",
    items: [
      "Ken reserves the right to suspend or terminate any partner account found in violation.",
      "Unpaid earnings at the time of termination are forfeited if violations are confirmed.",
      "Honest mistakes are handled case by case — reach out before assuming the worst.",
    ],
  },
  {
    title: "General",
    items: [
      "Commission rates may change with 30 days advance notice.",
      "Override rates are not guaranteed — they depend on your team's monthly activity.",
      "This is not employment — partners are independent earners.",
      "Hinilas Pro is not an investment scheme — income depends entirely on your effort and your team's usage.",
      "By joining the Partner Program, you agree to these terms in full.",
    ],
  },
];

export default function AffiliateTermsPage() {
  return (
    <main className="min-h-full pt-16 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/affiliate"
            className="inline-flex items-center gap-1.5 text-sm font-semibold mb-6"
            style={{ color: "#65676B" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Partner Program
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BRAND_ORANGE }}>Partner Program</p>
          <h1 className="text-3xl font-black text-[#1c1e21]">Terms & Conditions</h1>
          <p className="text-slate-500 text-sm mt-2">By joining, you agree to these terms. Read them fully before registering your GCash.</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.title} className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E6EB" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#E4E6EB" }}>
                <h2 className="font-black text-[#1c1e21]">{section.title}</h2>
              </div>
              <ul className="divide-y" style={{ borderColor: "#E4E6EB" }}>
                {section.items.map((item) => (
                  <li key={item} className="px-5 py-3 flex items-start gap-3">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: BRAND_ORANGE }} />
                    <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="rounded-2xl px-5 py-4 text-center" style={{ background: "#F8FAFC", border: "1px solid #E4E6EB" }}>
            <p className="text-xs text-slate-500">Questions? Message Ken directly at <span className="font-semibold text-[#1c1e21]">kevinrholette@gmail.com</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}
