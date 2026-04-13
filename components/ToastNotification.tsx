"use client";

import { useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
  amount: number;
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: { id: number; message: string; amount: number }; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto dismiss after 5s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300"
      style={{
        background: "#0A1A10",
        borderColor: "#22c55e40",
        boxShadow: "0 4px 24px rgba(34,197,94,0.15)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        minWidth: "260px",
      }}
    >
      <span className="text-lg">🎉</span>
      <div className="flex-1">
        <p className="text-emerald-400 text-sm font-bold">+{toast.amount} credits earned!</p>
        <p className="text-gray-400 text-xs">{toast.message}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-gray-600 hover:text-gray-400 text-sm leading-none ml-1">✕</button>
    </div>
  );
}

export type { Toast };
