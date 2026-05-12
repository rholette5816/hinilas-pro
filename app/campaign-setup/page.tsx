"use client";

import { useEffect, useRef, useState } from "react";
import FunnelProgress from "@/components/FunnelProgress";
import TierLock from "@/components/TierLock";
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
  Campaign: "#1877F2",
  "Ad Set": "#D97706",
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
    color: "#1877F2",
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
    color: "#1877F2",
    instructions: [
      "Click Create",
      "Select Engagement as your campaign objective",
      "Click Continue",
    ],
  },
  {
    label: "Campaign Setup",
    level: "Campaign",
    color: "#1877F2",
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
    color: "#D97706",
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
    color: "#D97706",
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
    color: "#D97706",
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
  const { refreshCredits, plan } = useApp();
  const [researchOutput, setResearchOutput] = useState("");
  const [activeTab, setActiveTab] = useState<"messenger" | "conversion">("messenger");
  const [copiedInterest, setCopiedInterest] = useState<string | null>(null);
  const isMax = plan === "max";

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
    // Word-boundary skip patterns: skip a line if its EXTRACTED bullet content matches.
    const skipPatterns = [
      /\bage\s*range\b/i,
      /\bgender\b/i,
      /\badvantage\+/i,
      /\b10\s*[-–]\s*15\b/i,
      /\blocation\b/i,
      /facebook\s+interest\s+suggestion/i,
      /^targeting\s+suggestion/i,
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Enter targeting section - must be a heading line
      if (
        lower.includes("targeting suggestion") ||
        (lower.includes("targeting") && (line.trim().startsWith("#") || line.trim().startsWith("**"))) ||
        lower.includes("facebook interest suggestion")
      ) {
        inTargeting = true;
        continue;
      }

      if (!inTargeting) continue;

      // Exit on next major heading
      const trimmed = line.trim();
      if (/^#{1,3}\s/.test(trimmed) || /^\*\*[A-Z]/.test(trimmed)) {
        if (interests.length > 0) break;
        continue;
      }

      // Match: "1. Word", "1) Word", "- Word", "* Word" (with optional leading whitespace)
      const match = line.match(/^\s*(?:\d+[.)]\s+|[-*•]\s+)(.+)/);
      if (!match) continue;

      const clean = match[1]
        .replace(/\s*\(.*?\)/g, "")
        .replace(/[*_:#]/g, "")
        .trim();

      if (clean.length <= 1 || clean.length >= 60) continue;

      // Skip-word check now runs on the EXTRACTED interest, with word boundaries
      if (skipPatterns.some(re => re.test(clean))) continue;

      interests.push(clean);
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
    <>
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <FunnelProgress currentStep={5} />
          <div className="mb-6 flex items-center justify-center gap-2 text-xs md:text-sm font-semibold" style={{ color: "#22c55e" }}>
            <span>✓</span>
            <span>All steps complete - Ready to launch your campaign</span>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1c1e21] mb-1">Campaign Setup</h1>
            <p className="text-[#1c1e21] text-sm">Step-by-step ad campaign guides</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("messenger")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === "messenger"
                ? { background: "#1877F2", color: "#fff" }
                : { background: "#FFFFFF", color: "#6B7280", border: "1px solid #1F2937" }
              }
            >
              Messenger Ads Setup
            </button>
            <button
              onClick={() => setActiveTab("conversion")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === "conversion"
                ? { background: "#8B5CF6", color: "#fff" }
                : { background: "#FFFFFF", color: "#6B7280", border: "1px solid #1F2937" }
              }
            >
              Conversion Setup
            </button>
          </div>

          {activeTab === "conversion" && (
            !isMax ? (
              <TierLock requiredTier="Max" featureName="Conversion Setup" />
            ) : (
            <div className="rounded-2xl border border-indigo-900 px-6 py-12 text-center" style={{ background: "#0D0B1F" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#1E1B4B" }}>
                <span className="text-2xl">Target</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 rounded-full px-3 py-1 mb-4">
                <span className="text-indigo-300 text-xs font-semibold">Coming Soon</span>
              </div>
              <h2 className="text-[#1c1e21] font-bold text-xl mb-2">Conversion Setup - Upcoming</h2>
              <p className="text-[#1c1e21] text-sm mb-1">This guide covers Facebook Pixel setup, website conversion campaigns, and purchase-optimized ad sets.</p>
              <p className="text-[#1c1e21] text-xs mb-6">Currently in production.</p>
              <p className="text-indigo-400 text-xs">Stay tuned - we&apos;ll notify you when it drops.</p>
            </div>
            )
          )}

          {activeTab === "messenger" && (
            <>
              {!done && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-[#1c1e21] mb-1.5">
                    <span>Step {currentStep + 1} of {TOTAL}</span>
                    <span>{progress}% complete</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
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
                  <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200" style={{ background: "#F0F2F5" }}>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200" style={{ background: "#FFFFFF" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: step.color }} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: step.color }}>{step.level} Level</span>
                      <span className="text-xs text-[#1c1e21] ml-1">- Tutorial Video</span>
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
                            <p className="text-center text-[#1c1e21] text-xs py-2">
                              Access expires {new Date(expiresAt).toLocaleString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <div>
                          {/* Thumbnail with lock overlay */}
                          <div className="relative w-full cursor-pointer" style={{ paddingBottom: "56.25%" }} onClick={() => unlockVideo(currentVideoKey)}>
                            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${step.color}18 0%, ${step.color}38 100%)`, borderBottom: `3px solid ${step.color}` }} />
                            {/* Dark overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.52)" }}>
                              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                              </div>
                              <p className="text-white text-sm font-bold">Watch Tutorial</p>
                              <p className="text-white/70 text-xs mt-0.5">1 credit · 24hr access</p>
                            </div>
                          </div>
                          {/* Unlock bar */}
                          <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: "#FFFFFF", borderTop: "1px solid #E4E6EB" }}>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: "#1c1e21" }}>{step.level} Level Tutorial</p>
                              {noCredits
                                ? <p className="text-xs" style={{ color: "#fa383e" }}>No credits left. Top up to watch.</p>
                                : <p className="text-xs" style={{ color: "#65676b" }}>Unlock once, watch for 24 hours</p>
                              }
                            </div>
                            <button
                              onClick={() => unlockVideo(currentVideoKey)}
                              disabled={isLoadingReward}
                              className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                              style={{ background: step.color, color: step.level === "Ad Set" ? "#000" : "#fff" }}
                            >
                              {isLoadingReward ? "Unlocking..." : "Unlock — 1 cr"}
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="relative w-full flex flex-col items-center justify-center" style={{ paddingBottom: "56.25%", background: "#f2f3f5" }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: `${step.color}20` }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                          <p className="text-sm font-semibold" style={{ color: step.color }}>{step.level} Level Tutorial</p>
                          <p className="text-xs mt-1" style={{ color: "#8a8d91" }}>Video coming soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Targeting suggestions - only on Audience Targeting step */}
              {!done && step.label === "Audience Targeting" && (
                <div className="mb-5 rounded-2xl border border-yellow-900/50 overflow-hidden" style={{ background: "#F0F2F5" }}>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200" style={{ background: "#FFFFFF" }}>
                    <span className="text-base">🎯</span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#D97706" }}>Targeting Suggestions</span>
                    <span className="text-xs text-[#1c1e21] ml-1">from your research</span>
                  </div>
                  <div className="px-4 py-4">
                    {researchOutput ? (() => {
                      const interests = parseInterests(researchOutput);
                      return interests.length > 0 ? (
                        <>
                          <p className="text-xs text-[#1c1e21] mb-3">Tap any interest to copy - paste directly into Detailed Targeting in Meta Ads Manager.</p>
                          <div className="flex flex-wrap gap-2">
                            {interests.map((interest, i) => (
                              <button
                                key={i}
                                onClick={() => copyInterest(interest)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
                                style={copiedInterest === interest
                                  ? { background: "#052e16", color: "#22c55e", border: "1px solid #22c55e60" }
                                  : { background: "rgba(217,119,6,0.1)", color: "#D97706", border: "1px solid rgba(217,119,6,0.3)" }
                                }
                              >
                                {copiedInterest === interest ? "✓ Copied" : interest}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-[#1c1e21]">No interest suggestions found in your research. Try re-running research for more detailed targeting ideas.</p>
                      );
                    })() : (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-[#1c1e21]">Run market research first to get interest targeting suggestions specific to your product.</p>
                        <a
                          href="/research"
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                          style={{ background: "rgba(217,119,6,0.15)", color: "#D97706", border: "1px solid rgba(217,119,6,0.3)" }}
                        >
                          Run Research →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {done ? (
                <div className="rounded-2xl border border-slate-200 p-8 text-center" style={{ background: "#F0F2F5" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#22c55e20" }}>
                    <span className="text-4xl">OK</span>
                  </div>
                  <h2 className="text-[#1c1e21] font-bold text-xl mb-2">Campaign Ready to Publish!</h2>
                  <p className="text-[#1c1e21] text-sm mb-6">Your Messenger Ads campaign is set up. Here&apos;s your final structure:</p>
                  <div className="space-y-3 mb-8">
                    {[
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, label: "1 Campaign", sub: "Engagement objective", color: "#1877F2" },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, label: "1 Ad Set", sub: "Angle-based targeting", color: "#D97706" },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label: "3 Ads", sub: "Different creatives", color: "#8B5CF6" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#FFFFFF", border: `1px solid ${item.color}30` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20`, color: item.color }}>
                          {item.icon}
                        </div>
                        <div className="text-left">
                          <p className="text-[#1c1e21] font-semibold text-sm">{item.label}</p>
                          <p className="text-[#1c1e21] text-xs">{item.sub}</p>
                        </div>
                        <span className="ml-auto text-xs font-bold" style={{ color: item.color }}>Done</span>
                      </div>
                    ))}
                  </div>
                  {/* Launch proof CTA */}
                  <div className="mb-6 p-4 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid #D9770630" }}>
                    <p className="text-yellow-400 font-bold text-sm mb-1">🚀 Claim Your Launch Reward</p>
                    <p className="text-[#1c1e21] text-xs mb-3">Submit a screenshot of your live campaign in Meta Ads Manager to earn <span className="text-[#1c1e21] font-bold">+20 credits</span>. Make sure the campaign status is visible and clear.</p>
                    <button
                      onClick={() => { setShowLaunchModal(true); setLaunchDone(false); setLaunchFile(null); setLaunchError(""); }}
                      className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #D97706, #ee6b0e)" }}
                    >
                      Submit Campaign Proof
                    </button>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button onClick={back} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-[#1c1e21] hover:text-[#1c1e21] transition-colors">
                      Back
                    </button>
                    <button onClick={restart} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: "#1877F2" }}>
                      Start Over
                    </button>
                  </div>

                  {/* Launch proof modal */}
                  {showLaunchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(7,11,20,0.85)", backdropFilter: "blur(12px)" }}>
                      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #D9770640" }}>
                        {launchDone ? (
                          <div className="text-center py-4">
                            <div className="text-5xl mb-4">🎉</div>
                            <h3 className="text-[#1c1e21] font-bold text-lg mb-2">Proof Submitted!</h3>
                            <p className="text-[#1c1e21] text-sm mb-6">Your screenshot is being reviewed. Credits will be added once approved.</p>
                            <button onClick={() => setShowLaunchModal(false)} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#1877F2" }}>Done</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-[#1c1e21] font-bold text-base">Submit Campaign Proof</h3>
                              <button onClick={() => setShowLaunchModal(false)} className="text-[#1c1e21] hover:text-[#1c1e21] text-sm">✕</button>
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
                              <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                                <span className="text-green-400 text-lg">✓</span>
                                <p className="text-[#1c1e21] text-xs flex-1 truncate">{launchFile.name}</p>
                                <button onClick={() => setLaunchFile(null)} className="text-[#1c1e21] hover:text-red-400 text-xs">Remove</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => launchInputRef.current?.click()}
                                className="w-full bg-white border border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-gray-500 transition-colors mb-4"
                              >
                                <p className="text-[#1c1e21] text-sm">Upload screenshot</p>
                                <p className="text-[#1c1e21] text-xs mt-0.5">PNG, JPG</p>
                              </button>
                            )}

                            {launchError && (
                              <p className="text-red-400 text-xs mb-4 text-center">{launchError}</p>
                            )}

                            <button
                              onClick={submitLaunchProof}
                              disabled={!launchFile || launchSubmitting}
                              className="w-full py-3 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                              style={{ background: "linear-gradient(135deg, #D97706, #ee6b0e)" }}
                            >
                              {launchSubmitting ? "Submitting..." : "Submit for Review - +20 cr"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ background: "#F0F2F5" }}>
                  <div className="px-6 py-4 border-b border-slate-200" style={{ background: "#FFFFFF" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${step.color}20`, color: step.color }}
                      >
                        {step.level} Level
                      </span>
                      <span className="text-[#1c1e21] text-xs">
                        {currentStep === 0 ? "Pre-Step" : `Step ${currentStep}`}
                      </span>
                    </div>
                    <h2 className="text-[#1c1e21] font-bold text-lg">{step.label}</h2>
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
                            <p className="text-[#1c1e21] text-sm leading-relaxed">{item}</p>
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
                        <div key={idx} className="ml-9 rounded-xl px-4 py-3" style={{ background: "#0A1628", border: "1px solid #1877F230" }}>
                          <p className="text-blue-300 text-sm">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
                    <button
                      onClick={back}
                      disabled={currentStep === 0}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-[#1c1e21] hover:text-[#1c1e21] disabled:opacity-30 transition-colors"
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
    </>
  );
}
