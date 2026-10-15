"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { EmployeeTable } from "@/components/EmployeeTable";
import { Pagination } from "@/components/Pagination";
import { ApiError } from "@/lib/api";
import { STATUS_LABELS, listDepartments, listEmployees, type EmployeeQuery } from "@/lib/employees";
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
