"use client";

import { Modal } from "./Modal";

interface Props {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, message, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <p className="confirm-message">{message}</p>
    </Modal>
  );
}
