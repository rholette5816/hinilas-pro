"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [setup, setSetupState] = useState<UserSetup | null>(null);
  const [researchOutput, setResearchOutputState] = useState("");
  const [anglesOutput, setAnglesOutputState] = useState("");
  const [selectedAngle, setSelectedAngleState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSetupState(load("hinilas_setup", null));
    setResearchOutputState(load("hinilas_research", ""));
    setAnglesOutputState(load("hinilas_angles", ""));
    setSelectedAngleState(load("hinilas_selectedAngle", ""));
    setHydrated(true);
  }, []);

  function setSetup(s: UserSetup) {
    setSetupState(s);
    save("hinilas_setup", s);
  }

  function setResearchOutput(s: string) {
    setResearchOutputState(s);
    save("hinilas_research", s);
  }

  function setAnglesOutput(s: string) {
    setAnglesOutputState(s);
    save("hinilas_angles", s);
  }

  function setSelectedAngle(s: string) {
    setSelectedAngleState(s);
    save("hinilas_selectedAngle", s);
  }

  if (!hydrated) return null;

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
