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
  selectedAngle: string;
  setSelectedAngle: (s: string) => void;
  creativeImage: string;
  setCreativeImage: (s: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetupState] = useState<UserSetup | null>(null);
  const [researchOutput, setResearchOutputState] = useState("");
  const [anglesOutput, setAnglesOutputState] = useState("");
  const [selectedAngle, setSelectedAngleState] = useState("");
  const [creativeImage, setCreativeImageState] = useState("");
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
        if (data.selected_angle) setSelectedAngleState(data.selected_angle);
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

  function setSelectedAngle(s: string) {
    setSelectedAngleState(s);
    persist({ selected_angle: s });
  }

  function setCreativeImage(s: string) {
    setCreativeImageState(s);
  }

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
      setup, setSetup,
      researchOutput, setResearchOutput,
      anglesOutput, setAnglesOutput,
      selectedAngle, setSelectedAngle,
      creativeImage, setCreativeImage,
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
