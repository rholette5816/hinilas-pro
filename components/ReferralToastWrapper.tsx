"use client";

import { useApp } from "@/lib/context";
import ToastNotification from "@/components/ToastNotification";

export default function ReferralToastWrapper() {
  const { referralToasts, dismissToast } = useApp();
  return <ToastNotification toasts={referralToasts} onDismiss={dismissToast} />;
}
