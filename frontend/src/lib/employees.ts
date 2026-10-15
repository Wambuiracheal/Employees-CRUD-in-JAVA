import { api } from "./api";
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
