"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { ApiError } from "@/lib/api";
import { STATUS_LABELS, createEmployee, updateEmployee } from "@/lib/employees";
import { EMAIL_RE, NAME_RE, PHONE_RE, firstError, maxLength, required } from "@/lib/validation";
import type { Employee, EmployeePayload, EmployeeStatus, FieldErrors } from "@/lib/types";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  salary: string;
  hireDate: string;
  status: EmployeeStatus;
}

const today = () => new Date().toLocaleDateString("en-CA"); // yyyy-MM-dd in local time

function toForm(e: Employee | null): FormState {
  return {
    firstName: e?.firstName ?? "",
    lastName: e?.lastName ?? "",
    email: e?.email ?? "",
    phone: e?.phone ?? "",
    department: e?.department ?? "",
    jobTitle: e?.jobTitle ?? "",
    salary: e ? String(e.salary) : "",
    hireDate: e?.hireDate ?? today(),
    status: e?.status ?? "ACTIVE",
  };
}

function validate(f: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const set = (key: keyof FormState, msg: string | undefined) => {
    if (msg) errors[key] = msg;
  };

  for (const [key, label] of [
    ["firstName", "First name"],
    ["lastName", "Last name"],
  ] as const) {
    set(
      key,
      firstError(
        required(f[key], label),
        maxLength(f[key], 50, label),
        NAME_RE.test(f[key].trim()) ? undefined : `${label} contains invalid characters`,
      ),
    );
  }
  set(
    "email",
    firstError(
      required(f.email, "Email"),
      maxLength(f.email, 150, "Email"),
      EMAIL_RE.test(f.email.trim()) ? undefined : "Email must be valid",
    ),
  );
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) {
    errors.phone = "Phone must be 7-20 digits and may start with +";
  }
  set("department", firstError(required(f.department, "Department"), maxLength(f.department, 50, "Department")));
  set("jobTitle", firstError(required(f.jobTitle, "Job title"), maxLength(f.jobTitle, 100, "Job title")));

  if (!f.salary.trim()) errors.salary = "Salary is required";
  else if (!/^\d{1,10}(\.\d{1,2})?$/.test(f.salary.trim()))
    errors.salary = "Salary must be a non-negative number with at most 2 decimals";

  if (!f.hireDate) errors.hireDate = "Hire date is required";
  else if (f.hireDate > today()) errors.hireDate = "Hire date cannot be in the future";

  return errors;
}

interface Props {
  employee: Employee | null;
  departments: string[];
  onClose(): void;
  onSaved(employee: Employee, created: boolean): void;
}

export function EmployeeFormModal({ employee, departments, onClose, onSaved }: Props) {
  const isEdit = employee !== null;
  const [form, setForm] = useState<FormState>(() => toForm(employee));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    // Re-validate a field as the user fixes it, once it has been touched.
    if (touched[key]) setErrors((prev) => ({ ...prev, [key]: validate(next)[key] ?? "" }));
  };

  const blur = (key: keyof FormState) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validate(form)[key] ?? "" }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(form).map((k) => [k, true])));
    if (Object.keys(found).length) return;

    const payload: EmployeePayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      jobTitle: form.jobTitle.trim(),
      salary: Number(form.salary),
      hireDate: form.hireDate,
      status: form.status,
      version: employee?.version,
    };

    setSaving(true);
    setFormError(null);
    try {
      const saved = isEdit ? await updateEmployee(employee.id, payload) : await createEmployee(payload);
      onSaved(saved, !isEdit);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.message === "Validation failed" ? "Please fix the highlighted fields." : err.message);
      } else {
        setFormError("Could not save the employee");
      }
    } finally {
      setSaving(false);
    }
  }

  const field = (
    key: keyof FormState,
    label: string,
    input: React.ReactNode,
    opts: { required?: boolean; full?: boolean } = { required: true },
  ) => (
    <div className={`field${opts.full ? " field-full" : ""}`}>
      <label htmlFor={`emp-${key}`}>
        {label}
        {opts.required && <span className="required">*</span>}
      </label>
      {input}
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  );

  const textInput = (key: keyof FormState, type = "text", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`emp-${key}`}
      type={type}
      className={`input${errors[key] ? " invalid" : ""}`}
      value={form[key]}
      onChange={change(key)}
      onBlur={blur(key)}
      aria-invalid={!!errors[key]}
      {...extra}
    />
  );

  return (
    <Modal
      title={isEdit ? `Edit ${employee.firstName} ${employee.lastName}` : "Add employee"}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="employee-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create employee"}
          </button>
        </>
      }
    >
      <form id="employee-form" className="form-grid" onSubmit={onSubmit} noValidate>
        {formError && <div className="alert alert-error field-full">{formError}</div>}

        {field("firstName", "First name", textInput("firstName", "text", { autoComplete: "off" }))}
        {field("lastName", "Last name", textInput("lastName", "text", { autoComplete: "off" }))}
        {field("email", "Email", textInput("email", "email", { autoComplete: "off" }))}
        {field("phone", "Phone", textInput("phone", "tel", { placeholder: "+254 712 000 000" }), { required: false })}
        {field("department", "Department", textInput("department", "text", { list: "department-options" }))}
        <datalist id="department-options">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        {field("jobTitle", "Job title", textInput("jobTitle"))}
        {field("salary", "Salary", textInput("salary", "number", { min: 0, step: "0.01", inputMode: "decimal" }))}
        {field("hireDate", "Hire date", textInput("hireDate", "date", { max: today() }))}
        {field(
          "status",
          "Status",
          <select id="emp-status" className="select" value={form.status} onChange={change("status")}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>,
        )}
      </form>
    </Modal>
  );
}
