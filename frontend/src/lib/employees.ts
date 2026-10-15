import { api, apiFetch } from "./api";
import type { Employee, EmployeePayload, EmployeeStatus, Page } from "./types";

export type SortDir = "asc" | "desc";

export interface EmployeeQuery {
  search: string;
  status: EmployeeStatus | "";
  department: string;
  page: number;
  size: number;
  sortBy: string;
  sortDir: SortDir;
}

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

/** Builds query params, omitting empty filters. Shared by list and export. */
export function toSearchParams(query: Partial<EmployeeQuery>): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });
  return params;
}

export function listEmployees(query: EmployeeQuery, signal?: AbortSignal) {
  return api<Page<Employee>>(`/api/employees?${toSearchParams(query)}`, { signal });
}

export function listDepartments() {
  return api<string[]>("/api/employees/departments");
}

export function createEmployee(payload: EmployeePayload) {
  return api<Employee>("/api/employees", { method: "POST", body: JSON.stringify(payload) });
}

export function updateEmployee(id: number, payload: EmployeePayload) {
  return api<Employee>(`/api/employees/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteEmployee(id: number) {
  return api<void>(`/api/employees/${id}`, { method: "DELETE" });
}

export type ExportFormat = "csv" | "json";

/**
 * Downloads all employees matching the current filters/sort (ignoring paging).
 * Fetched with the JWT then saved via a temporary object URL, since a plain link cannot send the header.
 */
export async function exportEmployees(query: EmployeeQuery, format: ExportFormat): Promise<void> {
  const { search, status, department, sortBy, sortDir } = query;
  const params = toSearchParams({ search, status, department, sortBy, sortDir });
  params.set("format", format);

  const response = await apiFetch(`/api/employees/export?${params}`);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `employees.${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
