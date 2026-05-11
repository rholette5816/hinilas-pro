"use client";

import { useRouter } from "next/navigation";

interface FireCelebrationProps {
  show: boolean;
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
      <path
        d="M4 10h10m0 0-4-4m4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function FireCelebration({ show }: FireCelebrationProps) {
  const router = useRouter();

  if (!show) return null;

  const particles = [
    { left: "10%", top: "18%", delay: "0s", duration: "3.3s" },
    { left: "28%", top: "70%", delay: "0.8s", duration: "3.9s" },
    { left: "72%", top: "22%", delay: "0.4s", duration: "3.1s" },
    { left: "88%", top: "64%", delay: "1.1s", duration: "4.2s" },
  ];

  return (
    <div className="mt-6 w-full overflow-hidden rounded-2xl p-5 md:p-8 relative" style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(239,68,68,0.35)", boxShadow: "0 0 28px rgba(239,68,68,0.12)" }}>
      <style jsx>{`
        @keyframes fireEmojiPulse {
          0% { transform: scale(0.94) rotate(-3deg); }
          100% { transform: scale(1.08) rotate(3deg); }
        }

        @keyframes fireBannerGlow {
          0% { box-shadow: 0 0 18px rgba(217,119,6,0.12), inset 0 0 0 rgba(239,68,68,0.1); }
          100% { box-shadow: 0 0 34px rgba(239,68,68,0.22), inset 0 0 16px rgba(217,119,6,0.08); }
        }

        @keyframes fireParticleFloat {
          0% { transform: translateY(10px) scale(0.8); opacity: 0; }
          20% { opacity: 0.95; }
          100% { transform: translateY(-38px) scale(1.08); opacity: 0; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ animation: "fireBannerGlow 2s ease-in-out infinite alternate" }}
      />

      {particles.map((particle, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute text-sm md:text-base"
          style={{
            left: particle.left,
            top: particle.top,
            animation: `fireParticleFloat ${particle.duration} ease-in-out infinite`,
            animationDelay: particle.delay,
          }}
        >
          🔥
        </span>
      ))}

      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
              style={{
                background: "rgba(217,119,6,0.18)",
                border: "1px solid rgba(217,119,6,0.35)",
                animation: "fireEmojiPulse 1.7s ease-in-out infinite alternate",
              }}
            >
              🔥
            </div>
            <div>
              <h2 className="text-white font-black text-xl md:text-2xl">You&apos;re on fire!</h2>
              <p className="text-xs md:text-sm text-gray-400">
                Your campaign assets are ready. One more step to launch.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/campaign-setup")}
          className="relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 md:w-auto"
          style={{ background: "#EF4444" }}
        >
          <span>Launch Your Campaign</span>
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}
