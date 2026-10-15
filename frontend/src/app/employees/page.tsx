"use client";

import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/RequireAuth";

export default function EmployeesPage() {
  return (
    <RequireAuth>
      <AppHeader />
      <main className="container">
        <div className="page-header">
          <h1>Employees</h1>
        </div>
      </main>
    </RequireAuth>
  );
}
