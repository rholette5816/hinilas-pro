"use client";

import { useApp, derivePlan } from "@/lib/context";

interface Props {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const TIER_COLORS = {
  lite: { accent: "#9CA3AF", label: "Silver" },   // silver
  flex: { accent: "#F5A623", label: "Pro" },       // orange (current)
  max:  { accent: "#EF4444", label: "Max" },       // red
};

export function HinilasIcon({ size = "md", accentColor = "#F5A623" }: { size?: "sm" | "md" | "lg"; accentColor?: string }) {
  const dim = size === "sm" ? 28 : size === "lg" ? 48 : 36;

  return (
    <svg width={dim} height={dim} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#0F172A" />
      <rect width="48" height="48" rx="10" fill="url(#grad)" fillOpacity="0.15" />

      <line x1="14" y1="10" x2="14" y2="38" stroke="#2B7EC9" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="34" y1="10" x2="34" y2="38" stroke="#2B7EC9" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="14" y1="24" x2="34" y2="24" stroke="#2B7EC9" strokeWidth="3.5" strokeLinecap="round" />

      <circle cx="14" cy="10" r="3" fill={accentColor} />
      <circle cx="14" cy="38" r="3" fill="#2B7EC9" />
      <circle cx="34" cy="10" r="3" fill="#2B7EC9" />
      <circle cx="34" cy="38" r="3" fill={accentColor} />
      <circle cx="14" cy="24" r="2.5" fill={accentColor} />
      <circle cx="34" cy="24" r="2.5" fill={accentColor} />

      <line x1="14" y1="10" x2="8" y2="10" stroke="#2B7EC9" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10" r="1.5" fill="#2B7EC9" fillOpacity="0.6" />
      <line x1="34" y1="10" x2="40" y2="10" stroke="#2B7EC9" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="41" cy="10" r="1.5" fill="#2B7EC9" fillOpacity="0.6" />
      <line x1="14" y1="38" x2="8" y2="38" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="38" r="1.5" fill={accentColor} fillOpacity="0.6" />
      <line x1="34" y1="38" x2="40" y2="38" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="41" cy="38" r="1.5" fill={accentColor} fillOpacity="0.6" />

      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2B7EC9" />
          <stop offset="100%" stopColor={accentColor} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HinilasLogo({ size = "md", showTagline = false }: Props) {
  const { credits } = useApp();
  const plan = derivePlan(credits);
  const tier = TIER_COLORS[plan as keyof typeof TIER_COLORS] ?? TIER_COLORS.lite;

  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  const subSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className="flex items-center gap-2.5">
      <HinilasIcon size={size} accentColor={tier.accent} />
      <div className="leading-tight">
        <div className="flex items-baseline gap-0">
          <span className={`text-white font-bold ${textSize} tracking-wide`}>Hinilas</span>
          <span className={`font-bold ${textSize} tracking-wide`} style={{ color: tier.accent }}>{tier.label}</span>
        </div>
        {showTagline ? (
          <p className={`${subSize} font-semibold tracking-widest uppercase leading-none mt-0.5`} style={{ color: "#2B7EC9" }}>
            AI Driven. Results Focused.
          </p>
        ) : (
          <p className={`${subSize} text-gray-500 leading-none`}>Meta Ads AI Assistant</p>
        )}
      </div>
    </div>
  );
}
