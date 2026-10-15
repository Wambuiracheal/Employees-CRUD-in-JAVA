"use client";

import type { Employee, EmployeeStatus } from "@/lib/types";
import { STATUS_LABELS, type SortDir } from "@/lib/employees";
import { formatDate, formatMoney } from "@/lib/format";

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  ACTIVE: "badge-success",
  ON_LEAVE: "badge-warning",
  TERMINATED: "badge-danger",
};

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  align?: "right";
}

const COLUMNS: Column[] = [
  { key: "lastName", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "department", label: "Department", sortable: true },
  { key: "jobTitle", label: "Job title", sortable: true },
  { key: "salary", label: "Salary", sortable: true, align: "right" },
  { key: "hireDate", label: "Hired", sortable: true },
  { key: "status", label: "Status", sortable: true },
];

interface Props {
  employees: Employee[];
  sortBy: string;
  sortDir: SortDir;
  loading: boolean;
  onSort(column: string): void;
  renderActions?(employee: Employee): React.ReactNode;
}

export function EmployeeTable({ employees, sortBy, sortDir, loading, onSort, renderActions }: Props) {
  return (
    <div className={`table-wrap${loading ? " is-loading" : ""}`}>
      <table className="table">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  className={col.align === "right" ? "num" : undefined}
                  aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button type="button" className={`th-sort${active ? " active" : ""}`} onClick={() => onSort(col.key)}>
                    {col.label}
                    <span className="sort-indicator" aria-hidden>
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
            {renderActions && <th className="actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && !loading && (
            <tr>
              <td colSpan={COLUMNS.length + (renderActions ? 1 : 0)} className="empty">
                No employees match your filters.
              </td>
            </tr>
          )}
          {employees.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="cell-name">
                  {e.firstName} {e.lastName}
                </div>
                {e.phone && <div className="cell-sub">{e.phone}</div>}
              </td>
              <td>{e.email}</td>
              <td>{e.department}</td>
              <td>{e.jobTitle}</td>
              <td className="num">{formatMoney(e.salary)}</td>
              <td className="nowrap">{formatDate(e.hireDate)}</td>
              <td>
                <span className={`badge ${STATUS_BADGE[e.status]}`}>{STATUS_LABELS[e.status]}</span>
              </td>
              {renderActions && <td className="actions-col">{renderActions(e)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
