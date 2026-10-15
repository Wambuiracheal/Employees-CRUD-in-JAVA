"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { EmployeeTable } from "@/components/EmployeeTable";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmployeeFormModal } from "@/components/EmployeeFormModal";
import { Toast, type ToastMessage } from "@/components/Toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  STATUS_LABELS,
  deleteEmployee,
  listDepartments,
  listEmployees,
  type EmployeeQuery,
} from "@/lib/employees";
import { useDebounce } from "@/lib/useDebounce";
import type { Employee, EmployeeStatus, Page } from "@/lib/types";

const INITIAL_QUERY: EmployeeQuery = {
  search: "",
  status: "",
  department: "",
  page: 0,
  size: 10,
  sortBy: "lastName",
  sortDir: "asc",
};

function EmployeesView() {
  const [query, setQuery] = useState<EmployeeQuery>(INITIAL_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput);
  const [data, setData] = useState<Page<Employee> | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { isAdmin } = useAuth();
  // undefined = closed, null = creating, Employee = editing
  const [editing, setEditing] = useState<Employee | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const notify = (type: ToastMessage["type"], text: string) => setToast({ id: Date.now(), type, text });
  const reload = () => setReloadKey((k) => k + 1);

  function handleSaved(employee: Employee, created: boolean) {
    setEditing(undefined);
    notify("success", `${employee.firstName} ${employee.lastName} was ${created ? "created" : "updated"}.`);
    reload();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteEmployee(deleting.id);
      notify("success", `${deleting.firstName} ${deleting.lastName} was deleted.`);
      setDeleting(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Could not delete the employee");
    } finally {
      setDeleteBusy(false);
    }
  }

  // Changing any filter resets to the first page.
  const update = useCallback((patch: Partial<EmployeeQuery>) => {
    setQuery((q) => ({ ...q, page: 0, ...patch }));
  }, []);

  useEffect(() => {
    setQuery((q) => (q.search === debouncedSearch ? q : { ...q, page: 0, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    listDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listEmployees(query, controller.signal)
      .then((page) => {
        // If the current page became empty (e.g. after a delete), step back one page.
        if (page.content.length === 0 && page.page > 0) {
          setQuery((q) => ({ ...q, page: Math.max(0, page.totalPages - 1) }));
          return;
        }
        setData(page);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Failed to load employees");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  function toggleSort(column: string) {
    setQuery((q) => ({
      ...q,
      sortBy: column,
      sortDir: q.sortBy === column && q.sortDir === "asc" ? "desc" : "asc",
    }));
  }

  const hasFilters = searchInput || query.status || query.department;

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="subtitle">{data ? `${data.totalElements} records` : "Loading…"}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            + Add employee
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            type="search"
            className="input search-input"
            placeholder="Search name, email, department or title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search employees"
          />
          <select
            className="select"
            value={query.status}
            onChange={(e) => update({ status: e.target.value as EmployeeStatus | "" })}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={query.department}
            onChange={(e) => update({ department: e.target.value })}
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setSearchInput("");
                update({ search: "", status: "", department: "" });
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error table-alert">
            {error}{" "}
            <button type="button" className="btn btn-link" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        )}

        <EmployeeTable
          employees={data?.content ?? []}
          sortBy={query.sortBy}
          sortDir={query.sortDir}
          loading={loading}
          onSort={toggleSort}
          renderActions={(employee) => (
            <div className="row-actions">
              <button type="button" className="btn btn-sm" onClick={() => setEditing(employee)}>
                Edit
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger-outline"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(employee);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        />

        {data && (
          <Pagination
            page={data.page}
            size={data.size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
            onSizeChange={(size) => update({ size })}
          />
        )}
      </div>

      {editing !== undefined && (
        <EmployeeFormModal
          // Remount per record so the form state starts fresh.
          key={editing?.id ?? "new"}
          employee={editing}
          departments={departments}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete employee"
          message={
            <>
              Permanently delete{" "}
              <strong>
                {deleting.firstName} {deleting.lastName}
              </strong>
              ? This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}

export default function EmployeesPage() {
  return (
    <RequireAuth>
      <AppHeader />
      <EmployeesView />
    </RequireAuth>
  );
}
