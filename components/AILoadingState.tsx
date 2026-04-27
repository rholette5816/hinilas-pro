"use client";

import { useEffect, useState } from "react";

interface AILoadingStateProps {
  messages: string[];
  estimatedTime: string;
  icon?: string;
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5v5l3 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function AILoadingState({
  messages,
  estimatedTime,
  icon = "🔍",
}: AILoadingStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [messages]);

  const currentMessage = messages[currentIndex] ?? "";

  return (
    <div className="w-full py-12">
      <style jsx>{`
        @keyframes loadingIconPulse {
          0% { transform: scale(0.96); opacity: 0.88; }
          100% { transform: scale(1.06); opacity: 1; }
        }

        @keyframes loadingMessageFade {
          0% { opacity: 0; transform: translateY(6px); }
          18% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }

        @keyframes loadingTrackGlow {
          0% { transform: translateX(-38%); }
          100% { transform: translateX(138%); }
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold md:text-sm"
          style={{ background: "#0F172A", border: "1px solid #1E2D45", color: "#94A3B8" }}
        >
          <span style={{ color: "#F5A623" }}>
            <ClockIcon />
          </span>
          <span>{estimatedTime}</span>
        </div>

        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full text-4xl md:h-24 md:w-24 md:text-5xl"
          style={{
            background: "rgba(245,166,35,0.12)",
            border: "1px solid rgba(245,166,35,0.3)",
            boxShadow: "0 0 28px rgba(245,166,35,0.18)",
            animation: "loadingIconPulse 1.8s ease-in-out infinite alternate",
          }}
        >
          <span role="img" aria-label="Loading icon">
            {icon}
          </span>
        </div>

        <div className="mb-6 min-h-[3rem] px-3 md:min-h-[3.5rem]">
          <p
            key={currentIndex}
            className="text-sm font-semibold text-white md:text-base"
            style={{ animation: "loadingMessageFade 2.5s ease-in-out both" }}
          >
            {currentMessage}
          </p>
        </div>

        <div
          className="relative h-2.5 w-full max-w-md overflow-hidden rounded-full"
          style={{ background: "#1E2D45" }}
        >
          <div
            className="absolute inset-y-0 left-0 w-1/2 rounded-full"
            style={{
              background: "linear-gradient(90deg, rgba(245,166,35,0) 0%, #F5A623 50%, rgba(245,166,35,0) 100%)",
              animation: "loadingTrackGlow 1.7s linear infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
