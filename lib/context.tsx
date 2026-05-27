"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { deriveTier } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";

export interface UserSetup {
  businessName: string;
  product: string;
  targetAudience: string;
  uniqueSellingOffer: string;
  market: string;
  businessType: "physical_product" | "service" | "digital";
  stage: "just_starting" | "have_page" | "running_ads";
  language: string;
  industry?: string;
}

export interface ReferralToast {
  id: number;
  message: string;
  amount: number;
}

export interface ContentPost {
  type: string;
  caption: string;
  image?: string;
  language: string;
}

export interface ContentOutput {
  posts: ContentPost[];
  scripts?: string[];
  scriptHookStyle?: string;
  language: string;
  generatedAt: string;
}

interface AppContextType {
  setup: UserSetup | null;
  setSetup: (s: UserSetup) => void;
  researchOutput: string;
  setResearchOutput: (s: string) => void;
  contentOutput: ContentOutput | null;
  setContentOutput: (c: ContentOutput) => void;
  anglesOutput: string;
  setAnglesOutput: (s: string) => void;
  copyOutput: string;
  setCopyOutput: (s: string) => void;
  selectedAngle: string;
  setSelectedAngle: (s: string) => void;
  creativeImage: string;
  setCreativeImage: (s: string) => void;
  savedImages: { main: string | null; v1: string | null; v2: string | null };
  saveAdImages: (main: string | null, v1: string | null, v2: string | null) => Promise<void>;
  savedVideos: { v1: string | null; v2: string | null; v3: string | null };
  savedVideoPrompts: string[];
  saveVideos: (urls: (string | null)[], prompts: string[]) => Promise<void>;
  credits: number;
  creditsTotal: number;
  plan: string;
  tierLockExpiresAt: Date | null;
  refreshCredits: () => Promise<void>;
  referralToasts: ReferralToast[];
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function parseTierLockExpiresAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function derivePlan(
  credits: number,
  lockedTier?: string | null,
  tierExpiresAt?: string | Date | null
): string {
  return deriveTier(credits, lockedTier, tierExpiresAt).toLowerCase();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetupState] = useState<UserSetup | null>(null);
  const [researchOutput, setResearchOutputState] = useState("");
  const [contentOutput, setContentOutputState] = useState<ContentOutput | null>(null);
  const [anglesOutput, setAnglesOutputState] = useState("");
  const [copyOutput, setCopyOutputState] = useState("");
  const [selectedAngle, setSelectedAngleState] = useState("");
  const [creativeImage, setCreativeImageState] = useState("");
  const [savedImages, setSavedImages] = useState<{ main: string | null; v1: string | null; v2: string | null }>({ main: null, v1: null, v2: null });
  const [savedVideos, setSavedVideos] = useState<{ v1: string | null; v2: string | null; v3: string | null }>({ v1: null, v2: null, v3: null });
  const [savedVideoPrompts, setSavedVideoPrompts] = useState<string[]>([]);
  const [credits, setCredits] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(5);
  const [lockedTier, setLockedTier] = useState<string | null>(null);
  const [tierLockExpiresAt, setTierLockExpiresAt] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [referralToasts, setReferralToasts] = useState<ReferralToast[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setHydrated(true); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("user_data")
        .select("*, locked_tier, tier_expires_at")
        .eq("user_id", user.id)
        .single();

      if (data) {
        if (data.setup) setSetupState(data.setup);
        if (data.research_output) setResearchOutputState(data.research_output);
        if (data.content_output) setContentOutputState(data.content_output);
        if (data.angles_output) setAnglesOutputState(data.angles_output);
        if (data.copy_output) setCopyOutputState(data.copy_output);
        if (data.selected_angle) setSelectedAngleState(data.selected_angle);
        if (data.credits_remaining !== undefined) setCredits(data.credits_remaining);
        if (data.credits_total !== undefined) setCreditsTotal(data.credits_total);
        setLockedTier(data.locked_tier ?? null);
        setTierLockExpiresAt(parseTierLockExpiresAt(data.tier_expires_at));
        setSavedImages({
          main: data.main_image_url || null,
          v1: data.variation_1_url || null,
          v2: data.variation_2_url || null,
        });
        setSavedVideos({
          v1: data.video_1_url || null,
          v2: data.video_2_url || null,
          v3: data.video_3_url || null,
        });
        if (Array.isArray(data.video_prompts)) setSavedVideoPrompts(data.video_prompts);

        // Check for unread referral credits — run in background, don't block hydration
        const lastNotified = data.last_notified_at ? new Date(data.last_notified_at) : new Date(0);
        const lastNotifiedPlusBuffer = new Date(lastNotified.getTime() + 1000);

        supabase
          .from("credit_transactions")
          .select("id, amount, description, created_at")
          .eq("user_id", user.id)
          .in("type", ["referral", "topup", "grant"])
          .gt("created_at", lastNotifiedPlusBuffer.toISOString())
          .order("created_at", { ascending: false })
          .then(({ data: newReferrals }) => {
            if (newReferrals && newReferrals.length > 0) {
              setReferralToasts(newReferrals.map((r, i) => ({
                id: i,
                amount: r.amount,
                message: r.description,
              })));
              // Fire and forget — don't await
              supabase.from("user_data").update({ last_notified_at: new Date().toISOString() }).eq("user_id", user.id);
            }
          });
      }

      setHydrated(true);
    });
  }, []);

  async function persist(patch: Record<string, unknown>) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("user_data").upsert({
      user_id: userId,
      updated_at: new Date().toISOString(),
      ...patch,
    }, { onConflict: "user_id" });
  }

  function setSetup(s: UserSetup) {
    setSetupState(s);
    persist({ setup: s });
  }

  function setResearchOutput(s: string) {
    setResearchOutputState(s);
    persist({ research_output: s });
  }

  function setContentOutput(c: ContentOutput) {
    setContentOutputState(c);
    persist({ content_output: c });
  }

  function setAnglesOutput(s: string) {
    setAnglesOutputState(s);
    persist({ angles_output: s });
  }

  function setCopyOutput(s: string) {
    setCopyOutputState(s);
    persist({ copy_output: s });
  }

  function setSelectedAngle(s: string) {
    setSelectedAngleState(s);
    persist({ selected_angle: s });
  }

  function setCreativeImage(s: string) {
    setCreativeImageState(s);
  }

  async function uploadToStorage(base64: string, filename: string): Promise<string | null> {
    if (!userId) return null;
    try {
      const supabase = createClient();
      const [header, data] = base64.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
      const ext = mimeType.split("/")[1] || "png";
      const byteString = atob(data);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const path = `${userId}/${filename}.${ext}`;
      const { error } = await supabase.storage.from("ad-creative").upload(path, blob, { upsert: true });
      if (error) { console.error("[storage] upload error:", error.message); return null; }
      const { data: { publicUrl } } = supabase.storage.from("ad-creative").getPublicUrl(path);
      return publicUrl;
    } catch {
      return null;
    }
  }

  async function resolveImageUrl(img: string | null, filename: string): Promise<string | null> {
    if (!img) return null;
    if (!img.startsWith("data:")) return img; // already a URL
    const uploaded = await uploadToStorage(img, filename);
    // If storage upload fails, store the base64 directly so it always persists
    return uploaded ?? img;
  }

  async function saveAdImages(main: string | null, v1: string | null, v2: string | null) {
    const [mainUrl, v1Url, v2Url] = await Promise.all([
      resolveImageUrl(main, "main"),
      resolveImageUrl(v1, "variation_1"),
      resolveImageUrl(v2, "variation_2"),
    ]);
    setSavedImages({ main: mainUrl, v1: v1Url, v2: v2Url });
    await persist({ main_image_url: mainUrl, variation_1_url: v1Url, variation_2_url: v2Url });
  }

  async function saveVideos(urls: (string | null)[], prompts: string[]) {
    const [v1, v2, v3] = urls;
    setSavedVideos({ v1: v1 ?? null, v2: v2 ?? null, v3: v3 ?? null });
    setSavedVideoPrompts(prompts);
    await persist({ video_1_url: v1 ?? null, video_2_url: v2 ?? null, video_3_url: v3 ?? null, video_prompts: prompts });
  }

  function dismissToast(id: number) {
    setReferralToasts(prev => prev.filter(t => t.id !== id));
  }

  async function refreshCredits() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_data")
      .select("credits_remaining, credits_total, locked_tier, tier_expires_at")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setCredits(data.credits_remaining);
      setCreditsTotal(data.credits_total);
      setLockedTier(data.locked_tier ?? null);
      setTierLockExpiresAt(parseTierLockExpiresAt(data.tier_expires_at));
    }
  }

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      setup, setSetup,
      researchOutput, setResearchOutput,
      contentOutput, setContentOutput,
      anglesOutput, setAnglesOutput,
      copyOutput, setCopyOutput,
      selectedAngle, setSelectedAngle,
      creativeImage, setCreativeImage,
      savedImages, saveAdImages,
      savedVideos, savedVideoPrompts, saveVideos,
      credits,
      creditsTotal,
      plan: derivePlan(credits, lockedTier, tierLockExpiresAt),
      tierLockExpiresAt,
      refreshCredits,
      referralToasts, dismissToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function buildUserContext(setup: UserSetup, languageOverride?: string): string {
  return `Business: ${setup.businessName}
Product/Service: ${setup.product}
Target Audience: ${setup.targetAudience}
Unique Selling Offer: ${setup.uniqueSellingOffer || "Not specified"}
Market: ${setup.market}
Business Type: ${setup.businessType.replace("_", " ")}
Stage: ${setup.stage.replace(/_/g, " ")}
Language/Dialect: ${languageOverride || setup.language}`;
}
