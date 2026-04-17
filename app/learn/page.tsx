"use client";

import Sidebar from "@/components/Sidebar";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MODULES = [
  {
    title: "Phase 1 — Foundation",
    color: "#2B7EC9",
    topics: [
      "What do I need before running Meta Ads?",
      "How do I create a Facebook Business Portfolio?",
      "What kind of Facebook account should I use for ads?",
      "What payment methods work for Meta Ads in the Philippines?",
      "How do I create and set up a Facebook Page for my business?",
      "What starting budget do I need?",
      "What mistakes should I avoid before running ads?",
    ],
  },
  {
    title: "Phase 2 — Setup",
    color: "#8B5CF6",
    topics: [
      "How do I create a Meta Ads account?",
      "How do I connect my Facebook Page to my Ad Account?",
      "How do I add a payment method in Meta Ads Manager?",
      "What is Business Manager and do I need it?",
      "How do I verify my business on Meta?",
      "What is the Facebook Pixel and how do I set it up?",
      "How do I set up a Messenger auto-reply before launching?",
    ],
  },
  {
    title: "Phase 3 — Launch",
    color: "#F5A623",
    topics: [
      "What is Campaign, Ad Set, and Ad?",
      "What campaign objective should I use for my first campaign?",
      "Why use Engagement — Messages objective?",
      "How do I set up my first campaign step by step?",
      "What is Ad Set Budget vs Campaign Budget?",
      "What is the best daily budget to start with?",
      "How do I set my campaign start date and schedule?",
      "What is Advantage+ Campaign Budget and should I use it?",
      "How do I set up the Messenger destination and chat flow?",
    ],
  },
  {
    title: "Phase 4 — Targeting",
    color: "#10B981",
    topics: [
      "How does broad targeting work in 2025?",
      "Should I use interest targeting or leave it blank?",
      "What is Advantage+ Audience and how does it work?",
      "What audience size is ideal for Philippine ads?",
      "How do I target by location in the Philippines?",
      "What are Custom Audiences and how do I use them?",
      "What are Lookalike Audiences?",
      "How do I retarget people who messaged me before?",
    ],
  },
  {
    title: "Phase 5 — Creative & Copy",
    color: "#EC4899",
    topics: [
      "What are marketing angles and why do they matter?",
      "What are the 5 types of marketing angles?",
      "How do I write a scroll-stopping hook?",
      "What is the PAS formula and how do I use it?",
      "What is the BAB formula?",
      "What is the AIDA formula?",
      "What is the Story formula?",
      "What makes a good ad image?",
      "How long should my ad caption be?",
      "What is a CTA and what CTA should I use?",
    ],
  },
  {
    title: "Phase 6 — Metrics & Optimization",
    color: "#EF4444",
    topics: [
      "What metrics should I track in Meta Ads?",
      "What is a good Cost Per Message in the Philippines?",
      "What is CTR and what is a good rate?",
      "What is CPM and why does it matter?",
      "What is Frequency and when is it too high?",
      "What is the Learning Phase and how long does it last?",
      "How do I know if my ad is working?",
      "When should I turn off an ad?",
      "How do I scale my budget safely?",
      "What is ad creative fatigue and how do I fix it?",
      "How do I calculate my profit from ads?",
    ],
  },
  {
    title: "Phase 7 — Troubleshooting",
    color: "#6B7280",
    topics: [
      "Why is my ad not getting approved?",
      "Why was my ad account disabled and how do I recover it?",
      "Why am I spending but getting no messages?",
      "Why are my messages not converting to sales?",
      "Why did my ad stop performing after a few days?",
      "What are the 8 beginner mistakes to avoid?",
      "What are Meta Ads policies I should know?",
      "How do I duplicate a winning ad set?",
      "How do I refresh a creative without resetting the learning phase?",
    ],
  },
];

export default function LearnPage() {

  return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-3 py-1 mb-4">
                <span className="text-indigo-300 text-xs font-medium">📖 Courses</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Meta Ads Course</h1>
              <p className="text-gray-400 text-sm">Full Meta Ads roadmap from zero to profitable campaigns.</p>
            </div>

            <div className="rounded-2xl border border-indigo-900 px-6 py-12 text-center" style={{ background: "#0D0B1F" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#1E1B4B" }}>
                <span className="text-2xl">🚀</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 rounded-full px-3 py-1 mb-4">
                <span className="text-indigo-300 text-xs font-semibold">Coming Soon</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Full Course — Upcoming</h2>
              <p className="text-gray-400 text-sm mb-1">The Hinilas Pro full course is currently in production.</p>
              <p className="text-gray-500 text-xs mb-6">7 phases · 61 topics · Video lessons · Downloadable PDFs</p>
              <p className="text-indigo-400 text-xs">Stay tuned — we&apos;ll notify you when it drops.</p>
            </div>
          </div>
        </main>
      </div>
    );
}
