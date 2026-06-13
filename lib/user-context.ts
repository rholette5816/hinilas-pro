export interface BuildUserContextSetup {
  businessName: string;
  product: string;
  targetAudience: string;
  uniqueSellingOffer: string;
  market: string;
  businessType: string;
  stage: string;
  language: string;
}

export function buildUserContext(setup: BuildUserContextSetup, languageOverride?: string): string {
  return `Business: ${setup.businessName}
Product/Service: ${setup.product}
Target Audience: ${setup.targetAudience}
Unique Selling Offer: ${setup.uniqueSellingOffer || "Not specified"}
Market: ${setup.market}
Business Type: ${setup.businessType.replace("_", " ")}
Stage: ${setup.stage.replace(/_/g, " ")}
Language/Dialect: ${languageOverride || setup.language}`;
}
