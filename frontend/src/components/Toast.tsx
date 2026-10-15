"use client";

import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  type: "success" | "error";
  text: string;
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss(): void }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, 4000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
      <span>{toast.text}</span>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
