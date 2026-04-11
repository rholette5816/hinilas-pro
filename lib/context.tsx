"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface UserSetup {
  businessName: string;
  product: string;
  targetAudience: string;
  market: string;
  businessType: "physical_product" | "service" | "digital";
  stage: "just_starting" | "have_page" | "running_ads";
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState<UserSetup | null>(null);
  const [researchOutput, setResearchOutput] = useState("");
  const [anglesOutput, setAnglesOutput] = useState("");
  const [selectedAngle, setSelectedAngle] = useState("");

  return (
    <AppContext.Provider value={{
      setup, setSetup,
      researchOutput, setResearchOutput,
      anglesOutput, setAnglesOutput,
      selectedAngle, setSelectedAngle,
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

export function buildUserContext(setup: UserSetup): string {
  return `Business: ${setup.businessName}
Product/Service: ${setup.product}
Target Audience: ${setup.targetAudience}
Market: ${setup.market}
Business Type: ${setup.businessType.replace("_", " ")}
Stage: ${setup.stage.replace(/_/g, " ")}`;
}
