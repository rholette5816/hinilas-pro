"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/lib/context";
import { createClient } from "@/lib/supabase/client";

type Level = "Campaign" | "Ad Set" | "Ads";
type VideoKey = "campaign" | "adset" | "ads";

interface Step {
  label: string;
  level: Level;
  color: string;
  instructions: (string | { type: "example"; text: string } | { type: "note"; text: string })[];
}

const LEVEL_COLORS: Record<Level, string> = {
  Campaign: "#2B7EC9",
  "Ad Set": "#F5A623",
  Ads: "#8B5CF6",
};

const LEVEL_VIDEOS: Record<Level, string> = {
  Campaign: "https://www.loom.com/embed/e594f91be4314832b75e295791f70ea0",
  "Ad Set": "https://www.loom.com/embed/7f598578f67540f0a33c2ff45015e116",
  Ads: "https://www.loom.com/embed/2268db0a4a84402a95eb9c7f0fd7aba2",
};

const LEVEL_VIDEO_KEYS: Record<Level, VideoKey> = {
  Campaign: "campaign",
  "Ad Set": "adset",
  Ads: "ads",
};

const STEPS: Step[] = [
  {
    label: "Access Ads Manager",
    level: "Campaign",
    color: "#2B7EC9",
    instructions: [
      "Go to business.facebook.com",
      "On the top interface, locate the business logo with a dropdown menu",
      "Click the dropdown and choose your account",
      "Click your profile picture, then choose the Facebook Page you want to advertise",
      "Inside the page dashboard, find Ads Manager on the left side",
      "Click Ads Manager",
      "Inside Ads Manager, click Campaigns",
      { type: "note", text: "You will now be redirected to your personal Ads Manager dashboard." },
    ],
  },
  {
    label: "Create Campaign",
    level: "Campaign",
    color: "#2B7EC9",
    instructions: [
      "Click Create",
      "Select Engagement as your campaign objective",
      "Click Continue",
    ],
  },
  {
    label: "Campaign Setup",
    level: "Campaign",
    color: "#2B7EC9",
    instructions: [
      "Set a clear campaign name",
      { type: "example", text: "Real Estate - Condo Project A\nSkincare - Whitening Serum" },
      "Select Ad Set Budget (ABO)",
      "Do not enable shared campaign budget",
      "Leave other settings as default",
      "Click Next",
    ],
  },
  {
    label: "Ad Set Setup",
    level: "Ad Set",
    color: "#F5A623",
    instructions: [
      "Name your ad set based on the angle",
      { type: "example", text: "Affordable Offer\nLuxury Living\nLimited Slots" },
      "Conversion Location: set to Messages",
      "Choose the correct Facebook Page",
      "Under Messaging Apps, select Messenger only",
      "Performance Goal: choose Maximize number of conversations",
      "Cost Per Result Goal: leave as default",
    ],
  },
  {
    label: "Budget & Schedule",
    level: "Ad Set",
    color: "#F5A623",
    instructions: [
      "Budget Strategy: select Daily Budget",
      "Input your desired daily amount",
      "Set start date to tomorrow",
      "Set start time to 12:00 PM",
      "Do not set an end date",
    ],
  },
  {
    label: "Audience Targeting",
    level: "Ad Set",
    color: "#F5A623",
    instructions: [
      "Location: set your desired country, city, or specific area",
      "Age and Gender: leave as default",
      "Detailed Targeting: add relevant interests, behaviors, and demographics",
      { type: "note", text: "Keep the audience broad but still related to your business." },
    ],
  },
  {
    label: "Move to Ads",
    level: "Ads",
    color: "#8B5CF6",
    instructions: [
      "Click Next to proceed to the Ad level",
    ],
  },
  {
    label: "Ad Setup",
    level: "Ads",
    color: "#8B5CF6",
    instructions: [
      "Name your ad based on the creative",
      { type: "example", text: "Image 1 - Condo Exterior\nImage 2 - Living Room\nImage 3 - Payment Plan" },
      "Choose Image Ad",
      "Upload your creatives and select your first image",
      "Primary Text: add 2 variations",
      "Headline: add 2 headline variations",
      "Description: leave blank",
      "Call-To-Action: select the appropriate button for your business",
      "Enhancements: leave as default",
      "Click Next",
    ],
  },
  {
    label: "Duplicate Ads (Creative Testing)",
    level: "Ads",
    color: "#8B5CF6",
    instructions: [
      "Duplicate your first ad",
      "Open the duplicated ad and change the Ad Name",
      "Go to Ad Creative and replace with your second image",
      "Duplicate again for the third ad",
      "Change Ad Name and replace with the third image",
    ],
  },
  {
    label: "Publish",
    level: "Ads",
    color: "#8B5CF6",
    instructions: [
      "Review all settings",
      "Click Publish",
    ],
  },
];

const TOTAL = STEPS.length;

export default function CampaignSetupPage() {
  const { refreshCredits } = useApp();
  const [researchOutput, setResearchOutput] = useState("");
  const [activeTab, setActiveTab] = useState<"messenger" | "conversion">("messenger");
  const [copiedInterest, setCopiedInterest] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_data")
        .select("research_output")
        .eq("user_id", user.id)
        .single();
      if (data?.research_output) setResearchOutput(data.research_output);
    });
  }, []);

  function parseInterests(research: string): string[] {
    const lines = research.split("\n");
    const interests: string[] = [];
    let inTargeting = false;
    const skipWords = ["age", "gender", "advantage", "10–15", "10-15", "facebook interest", "location", "targeting suggestion", "suggestion"];

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Enter targeting section — must be a heading line
      if (
        (lower.includes("targeting suggestion") || lower.includes("targeting suggestions")) ||
        (lower.includes("targeting") && (line.startsWith("#") || line.startsWith("**"))) ||
        lower.includes("facebook interest suggestion")
      ) {
        inTargeting = true;
        continue;
      }

      if (!inTargeting) continue;

      // Exit on next major heading
      if (/^#{1,3}\s/.test(line) || /^\*\*[A-Z]/.test(line)) {
        if (interests.length > 0) break;
        continue;
      }

      if (skipWords.some(s => lower.includes(s))) continue;

      // Match: "1. Word", "1) Word", "- Word", "* Word"
      const match = line.match(/^(?:\d+[.)]\s+|[-*•]\s+)(.+)/);
      if (match) {
        const clean = match[1]
          .replace(/\s*\(.*?\)/g, "")
          .replace(/[*_:#]/g, "")
          .trim();
        if (clean.length > 1 && clean.length < 60) interests.push(clean);
      }
    }
    return interests.slice(0, 15);
  }

  function copyInterest(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedInterest(text);
    setTimeout(() => setCopiedInterest(null), 1500);
  }
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  // Launch proof submission
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchFile, setLaunchFile] = useState<File | null>(null);
  const [launchSubmitting, setLaunchSubmitting] = useState(false);
  const [launchDone, setLaunchDone] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const launchInputRef = useRef<HTMLInputElement>(null);

  async function submitLaunchProof() {
    if (!launchFile) return;
    setLaunchSubmitting(true);
    setLaunchError("");
    try {
      const formData = new FormData();
      formData.append("screenshot", launchFile);
      const res = await fetch("/api/launch/submit", { method: "POST", body: formData });
      const data = await res.json();
      if (data.rejected) {
        setLaunchError(data.error);
        setLaunchSubmitting(false);
        return;
      }
      if (!res.ok) {
        setLaunchError(data.error || "Something went wrong. Try again.");
        setLaunchSubmitting(false);
        return;
      }
      setLaunchDone(true);
      await refreshCredits();
    } catch {
      setLaunchError("Something went wrong. Try again.");
    } finally {
      setLaunchSubmitting(false);
    }
  }
  const [unlockedVideos, setUnlockedVideos] = useState<Record<VideoKey, { unlocked: boolean; expiresAt: string | null }>>({
    campaign: { unlocked: false, expiresAt: null },
    adset: { unlocked: false, expiresAt: null },
    ads: { unlocked: false, expiresAt: null },
  });
  const [unlockingVideo, setUnlockingVideo] = useState<VideoKey | null>(null);
  const [noCredits, setNoCredits] = useState(false);

  const step = STEPS[currentStep];
  const progress = Math.round((currentStep / TOTAL) * 100);
  const currentVideoKey = LEVEL_VIDEO_KEYS[step.level];

  useEffect(() => {
    async function loadVideoRewards() {
      try {
        const res = await fetch("/api/video-rewards");
        const data = await res.json();
        if (res.ok && data.videos) {
          setUnlockedVideos(prev => ({
            ...prev,
            campaign: data.videos.campaign,
            adset: data.videos.adset,
            ads: data.videos.ads,
          }));
        }
      } catch {
        // Keep default locked state if loading fails
      }
    }

    loadVideoRewards();
  }, []);

  function next() {
    if (currentStep === TOTAL - 1) {
      setDone(true);
    } else {
      setCurrentStep(s => s + 1);
    }
  }

  function back() {
    if (done) {
      setDone(false);
    } else {
      setCurrentStep(s => Math.max(0, s - 1));
    }
  }

  function restart() {
    setCurrentStep(0);
    setDone(false);
  }

  async function unlockVideo(videoKey: VideoKey) {
    if (unlockedVideos[videoKey].unlocked || unlockingVideo) return;

    setUnlockingVideo(videoKey);
    setNoCredits(false);
    try {
      const res = await fetch("/api/video-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoKey }),
      });
      const data = await res.json();

      if (res.status === 402 || data.code === "NO_CREDITS") {
        setNoCredits(true);
        return;
      }

      if (res.ok) {
        setUnlockedVideos(prev => ({ ...prev, [videoKey]: { unlocked: true, expiresAt: data.expiresAt } }));
        await refreshCredits();
      }
    } finally {
      setUnlockingVideo(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Campaign Setup</h1>
            <p className="text-gray-400 text-sm">Step-by-step ad campaign guides</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("messenger")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === "messenger"
                ? { background: "#2B7EC9", color: "#fff" }
                : { background: "#0F172A", color: "#6B7280", border: "1px solid #1F2937" }
              }
            >
              Messenger Ads Setup
            </button>
            <button
              disabled
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed"
              style={{ background: "#0F172A", color: "#374151", border: "1px solid #1F2937" }}
            >
              Conversion Setup Locked
            </button>
          </div>

          {activeTab === "conversion" && (
            <div className="rounded-2xl border border-indigo-900 px-6 py-12 text-center" style={{ background: "#0D0B1F" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#1E1B4B" }}>
                <span className="text-2xl">Target</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 rounded-full px-3 py-1 mb-4">
                <span className="text-indigo-300 text-xs font-semibold">Coming Soon</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Conversion Setup - Upcoming</h2>
              <p className="text-gray-400 text-sm mb-1">This guide covers Facebook Pixel setup, website conversion campaigns, and purchase-optimized ad sets.</p>
              <p className="text-gray-500 text-xs mb-6">Currently in production.</p>
              <p className="text-indigo-400 text-xs">Stay tuned - we&apos;ll notify you when it drops.</p>
            </div>
          )}

          {activeTab === "messenger" && (
            <>
              {!done && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Step {currentStep + 1} of {TOTAL}</span>
                    <span>{progress}% complete</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: step.color }}
                    />
                  </div>
                  <div className="flex gap-4 mt-3">
                    {(["Campaign", "Ad Set", "Ads"] as Level[]).map(lvl => (
                      <div key={lvl} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: step.level === lvl ? LEVEL_COLORS[lvl] : "#1F2937" }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: step.level === lvl ? LEVEL_COLORS[lvl] : "#374151" }}
                        >
                          {lvl} Level
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!done && (() => {
                const videoUrl = LEVEL_VIDEOS[step.level];
                const { unlocked: isUnlocked, expiresAt } = unlockedVideos[currentVideoKey];
                const isLoadingReward = unlockingVideo === currentVideoKey;

                return (
                  <div className="mb-5 rounded-2xl overflow-hidden border border-gray-700" style={{ background: "#0A0F1A" }}>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800" style={{ background: "#0F172A" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: step.color }} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: step.color }}>{step.level} Level</span>
                      <span className="text-xs text-gray-600 ml-1">- Tutorial Video</span>
                    </div>
                    {videoUrl ? (
                      isUnlocked ? (
                        <>
                          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                            <iframe
                              src={videoUrl}
                              className="absolute inset-0 w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          {expiresAt && (
                            <p className="text-center text-gray-600 text-xs py-2">
                              Access expires {new Date(expiresAt).toLocaleString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="px-6 py-10 text-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${step.color}20` }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                          <p className="text-white text-sm font-semibold mb-1">Unlock this tutorial video</p>
                          <p className="text-xs text-gray-500 mt-1 mb-1">Costs 1 credit · Access valid for 24 hours</p>
                          {noCredits && <p className="text-red-400 text-xs mb-3">No credits remaining. Top up to watch.</p>}
                          {!noCredits && <div className="mb-3" />}
                          <button
                            onClick={() => unlockVideo(currentVideoKey)}
                            disabled={isLoadingReward}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                            style={{ background: step.color, color: step.level === "Ad Set" ? "#000" : "#fff" }}
                          >
                            {isLoadingReward ? "Unlocking..." : "Unlock — 1 credit"}
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: `${step.color}20` }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: step.color }}>{step.level} Level Tutorial</p>
                        <p className="text-xs text-gray-600 mt-1">Video coming soon</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Targeting suggestions — only on Audience Targeting step */}
              {!done && step.label === "Audience Targeting" && (
                <div className="mb-5 rounded-2xl border border-yellow-900/50 overflow-hidden" style={{ background: "#0A0F1A" }}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800" style={{ background: "#0F172A" }}>
                    <span className="text-base">🎯</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F5A623" }}>Targeting Suggestions</span>
                    <span className="text-xs text-gray-600 ml-1">from your research</span>
                  </div>
                  <div className="px-4 py-4">
                    {researchOutput ? (() => {
                      const interests = parseInterests(researchOutput);
                      return interests.length > 0 ? (
                        <>
                          <p className="text-xs text-gray-500 mb-3">Tap any interest to copy — paste directly into Detailed Targeting in Meta Ads Manager.</p>
                          <div className="flex flex-wrap gap-2">
                            {interests.map((interest, i) => (
                              <button
                                key={i}
                                onClick={() => copyInterest(interest)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
                                style={copiedInterest === interest
                                  ? { background: "#052e16", color: "#22c55e", border: "1px solid #22c55e60" }
                                  : { background: "rgba(245,166,35,0.1)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }
                                }
                              >
                                {copiedInterest === interest ? "✓ Copied" : interest}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">No interest suggestions found in your research. Try re-running research for more detailed targeting ideas.</p>
                      );
                    })() : (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-gray-500">Run market research first to get interest targeting suggestions specific to your product.</p>
                        <a
                          href="/research"
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                          style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
                        >
                          Run Research →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {done ? (
                <div className="rounded-2xl border border-gray-700 p-8 text-center" style={{ background: "#0A0F1A" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#22c55e20" }}>
                    <span className="text-4xl">OK</span>
                  </div>
                  <h2 className="text-white font-bold text-xl mb-2">Campaign Ready to Publish!</h2>
                  <p className="text-gray-400 text-sm mb-6">Your Messenger Ads campaign is set up. Here&apos;s your final structure:</p>
                  <div className="space-y-3 mb-8">
                    {[
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, label: "1 Campaign", sub: "Engagement objective", color: "#2B7EC9" },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, label: "1 Ad Set", sub: "Angle-based targeting", color: "#F5A623" },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: "3 Ads", sub: "Different creatives", color: "#8B5CF6" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#0F172A", border: `1px solid ${item.color}30` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20`, color: item.color }}>
                          {item.icon}
                        </div>
                        <div className="text-left">
                          <p className="text-white font-semibold text-sm">{item.label}</p>
                          <p className="text-gray-500 text-xs">{item.sub}</p>
                        </div>
                        <span className="ml-auto text-xs font-bold" style={{ color: item.color }}>Done</span>
                      </div>
                    ))}
                  </div>
                  {/* Launch proof CTA */}
                  <div className="mb-6 p-4 rounded-xl" style={{ background: "#0F172A", border: "1px solid #F5A62330" }}>
                    <p className="text-yellow-400 font-bold text-sm mb-1">🚀 Claim Your Launch Reward</p>
                    <p className="text-gray-400 text-xs mb-3">Submit a screenshot of your live campaign in Meta Ads Manager to earn <span className="text-white font-bold">+20 credits</span>. Make sure the campaign status is visible and clear.</p>
                    <button
                      onClick={() => { setShowLaunchModal(true); setLaunchDone(false); setLaunchFile(null); setLaunchError(""); }}
                      className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #F5A623, #ee6b0e)" }}
                    >
                      Submit Campaign Proof
                    </button>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button onClick={back} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">
                      Back
                    </button>
                    <button onClick={restart} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: "#2B7EC9" }}>
                      Start Over
                    </button>
                  </div>

                  {/* Launch proof modal */}
                  {showLaunchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(7,11,20,0.85)", backdropFilter: "blur(12px)" }}>
                      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0F172A", border: "1px solid #F5A62340" }}>
                        {launchDone ? (
                          <div className="text-center py-4">
                            <div className="text-5xl mb-4">🎉</div>
                            <h3 className="text-white font-bold text-lg mb-2">Proof Submitted!</h3>
                            <p className="text-gray-400 text-sm mb-6">Your screenshot is being reviewed. Credits will be added once approved.</p>
                            <button onClick={() => setShowLaunchModal(false)} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#2B7EC9" }}>Done</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-white font-bold text-base">Submit Campaign Proof</h3>
                              <button onClick={() => setShowLaunchModal(false)} className="text-gray-500 hover:text-white text-sm">✕</button>
                            </div>
                            <div className="bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-3 mb-4">
                              <p className="text-yellow-300 text-xs font-medium mb-1">Screenshot requirements:</p>
                              <ul className="text-yellow-200 text-xs space-y-1 list-disc list-inside">
                                <li>Must show Meta Ads Manager interface</li>
                                <li>Campaign status must be visible (Active)</li>
                                <li>Screenshot must be clear, not cropped or blurry</li>
                                <li>One-time reward per verified launch</li>
                              </ul>
                            </div>

                            <input
                              ref={launchInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => setLaunchFile(e.target.files?.[0] || null)}
                            />

                            {launchFile ? (
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3 mb-4">
                                <span className="text-green-400 text-lg">✓</span>
                                <p className="text-gray-300 text-xs flex-1 truncate">{launchFile.name}</p>
                                <button onClick={() => setLaunchFile(null)} className="text-gray-500 hover:text-red-400 text-xs">Remove</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => launchInputRef.current?.click()}
                                className="w-full bg-gray-800 border border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-500 transition-colors mb-4"
                              >
                                <p className="text-gray-400 text-sm">Upload screenshot</p>
                                <p className="text-gray-600 text-xs mt-0.5">PNG, JPG</p>
                              </button>
                            )}

                            {launchError && (
                              <p className="text-red-400 text-xs mb-4 text-center">{launchError}</p>
                            )}

                            <button
                              onClick={submitLaunchProof}
                              disabled={!launchFile || launchSubmitting}
                              className="w-full py-3 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                              style={{ background: "linear-gradient(135deg, #F5A623, #ee6b0e)" }}
                            >
                              {launchSubmitting ? "Submitting..." : "Submit for Review — +20 cr"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-700 overflow-hidden" style={{ background: "#0A0F1A" }}>
                  <div className="px-6 py-4 border-b border-gray-800" style={{ background: "#0F172A" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${step.color}20`, color: step.color }}
                      >
                        {step.level} Level
                      </span>
                      <span className="text-gray-600 text-xs">
                        {currentStep === 0 ? "Pre-Step" : `Step ${currentStep}`}
                      </span>
                    </div>
                    <h2 className="text-white font-bold text-lg">{step.label}</h2>
                  </div>

                  <div className="px-6 py-5 space-y-3">
                    {step.instructions.map((item, idx) => {
                      if (typeof item === "string") {
                        return (
                          <div key={idx} className="flex gap-3">
                            <span
                              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                              style={{ background: `${step.color}20`, color: step.color }}
                            >
                              {idx + 1}
                            </span>
                            <p className="text-gray-200 text-sm leading-relaxed">{item}</p>
                          </div>
                        );
                      }

                      if (item.type === "example") {
                        return (
                          <div key={idx} className="ml-9 rounded-xl px-4 py-3" style={{ background: "#1C1200", border: "1px solid #92400E30" }}>
                            <p className="text-xs font-semibold text-amber-500 mb-1">Example</p>
                            {item.text.split("\n").map((line, i) => (
                              <p key={i} className="text-amber-200 text-sm">{line}</p>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="ml-9 rounded-xl px-4 py-3" style={{ background: "#0A1628", border: "1px solid #2B7EC930" }}>
                          <p className="text-blue-300 text-sm">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
                    <button
                      onClick={back}
                      disabled={currentStep === 0}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={next}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: step.color }}
                    >
                      {currentStep === TOTAL - 1 ? "Finish" : "Next ->"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
