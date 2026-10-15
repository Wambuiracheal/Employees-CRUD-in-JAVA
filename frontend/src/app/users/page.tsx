"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { Toast, type ToastMessage } from "@/components/Toast";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Role, User } from "@/lib/types";

function UsersView() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    api<User[]>("/api/users")
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load users"));
  }, []);

  async function changeRole(target: User, role: Role) {
    setSavingId(target.id);
    try {
      const updated = await api<User>(`/api/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers((list) => list?.map((u) => (u.id === updated.id ? updated : u)) ?? null);
      setToast({ id: Date.now(), type: "success", text: `${updated.fullName} is now ${updated.role}.` });
    } catch (err) {
      setToast({ id: Date.now(), type: "error", text: err instanceof ApiError ? err.message : "Update failed" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="subtitle">Admins can delete employees and manage user roles.</p>
        </div>
      </div>

      <div className="card">
        {error && <div className="alert alert-error table-alert">{error}</div>}
        <div className={`table-wrap${users === null && !error ? " is-loading" : ""}`}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="cell-name">
                    {u.fullName}
                    {u.id === me?.id && <span className="muted"> (you)</span>}
                  </td>
                  <td>{u.email}</td>
                  <td className="nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="select select-sm"
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      aria-label={`Role for ${u.fullName}`}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth adminOnly>
      <AppHeader />
      <UsersView />
    </RequireAuth>
  );
}
