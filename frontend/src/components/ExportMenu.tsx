"use client";

import { useEffect, useRef, useState } from "react";
import type { ExportFormat } from "@/lib/employees";

interface Props {
  onExport(format: ExportFormat): Promise<void>;
  disabled?: boolean;
}

export function ExportMenu({ onExport, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(format: ExportFormat) {
    setOpen(false);
    setBusy(true);
    try {
      await onExport(format);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="btn"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || busy}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? "Exporting…" : "Export ▾"}
      </button>
      {open && (
        <div className="dropdown-menu" role="menu">
          <button type="button" role="menuitem" className="dropdown-item" onClick={() => run("csv")}>
            Export as CSV
          </button>
          <button type="button" role="menuitem" className="dropdown-item" onClick={() => run("json")}>
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
}
