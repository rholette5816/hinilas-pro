"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

type Level = "Campaign" | "Ad Set" | "Ads";

interface Step {
  label: string;
  level: Level;
  color: string;
  instructions: (string | { type: "example"; text: string } | { type: "note"; text: string })[];
}

const LEVEL_COLORS: Record<Level, string> = {
  "Campaign": "#2B7EC9",
  "Ad Set": "#F5A623",
  "Ads": "#8B5CF6",
};

// Video URLs per level
const LEVEL_VIDEOS: Record<Level, string> = {
  "Campaign": "https://www.loom.com/embed/e594f91be4314832b75e295791f70ea0",
  "Ad Set": "https://www.loom.com/embed/7f598578f67540f0a33c2ff45015e116",
  "Ads": "https://www.loom.com/embed/2268db0a4a84402a95eb9c7f0fd7aba2",
};

const STEPS: Step[] = [
  {
    label: "Access Ads Manager",
    level: "Campaign",
    color: "#2B7EC9",
    instructions: [
      "Go to business.facebook.com",
      "On the top interface, locate the business logo with a dropdown menu",
      "Click the dropdown — you will see your Business Portfolio and your Account",
      "Select your account",
      "Click your profile picture, then choose the Facebook Page you want to advertise",
      "Once inside the page dashboard, look at the left-side navigation panel",
      "Under the page name, you will see: Home, Notifications, Ads Manager",
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
      "Set a clear campaign name — this acts as your label or identifier",
      { type: "example", text: "Real Estate – Condo Project A\nSkincare – Whitening Serum" },
      "Select Ad Set Budget (ABO)",
      "Make sure: Do NOT enable shared campaign budget",
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
      "Under Messaging Apps — select Messenger only",
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
      "Do NOT set an end date",
    ],
  },
  {
    label: "Audience Targeting",
    level: "Ad Set",
    color: "#F5A623",
    instructions: [
      "Location: set your desired country, city, or specific area",
      "Age & Gender: leave as default",
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
      { type: "example", text: "Image 1 – Condo Exterior\nImage 2 – Living Room\nImage 3 – Payment Plan" },
      "Choose Image Ad",
      "Upload your creatives and select your first image",
      "Primary Text: add 2 variations — click Add Text for the second version",
      "Headline: add 2 headline variations",
      "Description: leave blank",
      "Call-To-Action (CTA): select the appropriate button for your business",
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
      "Open the duplicated ad — change the Ad Name",
      "Go to Ad Creative, remove the existing image, upload or select your second image",
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
  const [activeTab, setActiveTab] = useState<"messenger" | "conversion">("messenger");
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  const step = STEPS[currentStep];
  const progress = Math.round(((currentStep) / TOTAL) * 100);

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Campaign Setup</h1>
            <p className="text-gray-400 text-sm">Step-by-step ad campaign guides</p>
          </div>

          {/* Tabs */}
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
              Conversion Setup 🔒
            </button>
          </div>

          {/* Conversion Coming Soon */}
          {activeTab === "conversion" && (
            <div className="rounded-2xl border border-indigo-900 px-6 py-12 text-center" style={{ background: "#0D0B1F" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#1E1B4B" }}>
                <span className="text-2xl">🎯</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 rounded-full px-3 py-1 mb-4">
                <span className="text-indigo-300 text-xs font-semibold">Coming Soon</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Conversion Setup — Upcoming</h2>
              <p className="text-gray-400 text-sm mb-1">This guide covers Facebook Pixel setup, website conversion campaigns, and purchase-optimized ad sets.</p>
              <p className="text-gray-500 text-xs mb-6">Currently in production.</p>
              <p className="text-indigo-400 text-xs">Stay tuned — we'll notify you when it drops.</p>
            </div>
          )}

          {/* Messenger Ads content */}
          {activeTab === "messenger" && <>

          {/* Progress bar */}
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
              {/* Level indicators */}
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

          {/* Level video — switches as user progresses through levels */}
          {!done && (() => {
            const videoUrl = LEVEL_VIDEOS[step.level];
            return (
              <div className="mb-5 rounded-2xl overflow-hidden border border-gray-700" style={{ background: "#0A0F1A" }}>
                {/* Level label */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800" style={{ background: "#0F172A" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: step.color }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: step.color }}>{step.level} Level</span>
                  <span className="text-xs text-gray-600 ml-1">— Tutorial Video</span>
                </div>
                {videoUrl ? (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={videoUrl}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
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

          {/* Done screen */}
          {done ? (
            <div className="rounded-2xl border border-gray-700 p-8 text-center" style={{ background: "#0A0F1A" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#22c55e20" }}>
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Campaign Ready to Publish!</h2>
              <p className="text-gray-400 text-sm mb-6">Your Messenger Ads campaign is set up. Here's your final structure:</p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: "🎯", label: "1 Campaign", sub: "Engagement objective", color: "#2B7EC9" },
                  { icon: "🎪", label: "1 Ad Set", sub: "Angle-based targeting", color: "#F5A623" },
                  { icon: "🖼", label: "3 Ads", sub: "Different creatives", color: "#8B5CF6" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#0F172A", border: `1px solid ${item.color}30` }}>
                    <span className="text-xl">{item.icon}</span>
                    <div className="text-left">
                      <p className="text-white font-semibold text-sm">{item.label}</p>
                      <p className="text-gray-500 text-xs">{item.sub}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold" style={{ color: item.color }}>✓</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={back} className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">
                  Back
                </button>
                <button onClick={restart} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: "#2B7EC9" }}>
                  Start Over
                </button>
              </div>
            </div>
          ) : (
            /* Step card */
            <div className="rounded-2xl border border-gray-700 overflow-hidden" style={{ background: "#0A0F1A" }}>
              {/* Card header */}
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

              {/* Instructions */}
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
                  if (item.type === "note") {
                    return (
                      <div key={idx} className="ml-9 rounded-xl px-4 py-3" style={{ background: "#0A1628", border: "1px solid #2B7EC930" }}>
                        <p className="text-blue-300 text-sm">{item.text}</p>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Navigation */}
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
                  {currentStep === TOTAL - 1 ? "Finish" : "Next →"}
                </button>
              </div>
            </div>
          )}

          </>}

        </div>
      </main>
    </div>
  );
}
