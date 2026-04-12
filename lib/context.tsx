"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
}

interface AppContextType {
  setup: UserSetup | null;
  setSetup: (s: UserSetup) => void;
  researchOutput: string;
  setResearchOutput: (s: string) => void;
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
  credits: number;
  creditsTotal: number;
  plan: string;
  refreshCredits: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function derivePlan(credits: number): string {
  if (credits >= 300) return "max";
  if (credits >= 50) return "flex";
  return "lite";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetupState] = useState<UserSetup | null>(null);
  const [researchOutput, setResearchOutputState] = useState("");
  const [anglesOutput, setAnglesOutputState] = useState("");
  const [copyOutput, setCopyOutputState] = useState("");
  const [selectedAngle, setSelectedAngleState] = useState("");
  const [creativeImage, setCreativeImageState] = useState("");
  const [savedImages, setSavedImages] = useState<{ main: string | null; v1: string | null; v2: string | null }>({ main: null, v1: null, v2: null });
  const [credits, setCredits] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(5);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setHydrated(true); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("user_data")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        if (data.setup) setSetupState(data.setup);
        if (data.research_output) setResearchOutputState(data.research_output);
        if (data.angles_output) setAnglesOutputState(data.angles_output);
        if (data.copy_output) setCopyOutputState(data.copy_output);
        if (data.selected_angle) setSelectedAngleState(data.selected_angle);
        if (data.credits_remaining !== undefined) setCredits(data.credits_remaining);
        if (data.credits_total !== undefined) setCreditsTotal(data.credits_total);
        setSavedImages({
          main: data.main_image_url || null,
          v1: data.variation_1_url || null,
          v2: data.variation_2_url || null,
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
      const { error } = await supabase.storage.from("ad-creatives").upload(path, blob, { upsert: true });
      if (error) return null;
      const { data: { publicUrl } } = supabase.storage.from("ad-creatives").getPublicUrl(path);
      return publicUrl;
    } catch {
      return null;
    }
  }

  async function saveAdImages(main: string | null, v1: string | null, v2: string | null) {
    const [mainUrl, v1Url, v2Url] = await Promise.all([
      main && main.startsWith("data:") ? uploadToStorage(main, "main") : Promise.resolve(main),
      v1 && v1.startsWith("data:") ? uploadToStorage(v1, "variation_1") : Promise.resolve(v1),
      v2 && v2.startsWith("data:") ? uploadToStorage(v2, "variation_2") : Promise.resolve(v2),
    ]);
    setSavedImages({ main: mainUrl, v1: v1Url, v2: v2Url });
    await persist({ main_image_url: mainUrl, variation_1_url: v1Url, variation_2_url: v2Url });
  }

  async function refreshCredits() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_data")
      .select("credits_remaining, credits_total")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setCredits(data.credits_remaining);
      setCreditsTotal(data.credits_total);
    }
  }

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      setup, setSetup,
      researchOutput, setResearchOutput,
      anglesOutput, setAnglesOutput,
      copyOutput, setCopyOutput,
      selectedAngle, setSelectedAngle,
      creativeImage, setCreativeImage,
      savedImages, saveAdImages,
      credits, creditsTotal, plan: derivePlan(credits), refreshCredits,
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
