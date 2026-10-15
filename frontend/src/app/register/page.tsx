"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { EMAIL_RE, PASSWORD_RE, firstError, maxLength, required } from "@/lib/validation";
import type { FieldErrors } from "@/lib/types";

export default function RegisterPage() {
  const { register, user, ready } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/employees");
  }, [ready, user, router]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const fullName = firstError(required(form.fullName, "Full name"), maxLength(form.fullName, 100, "Full name"));
    if (fullName) next.fullName = fullName;
    const email = firstError(
      required(form.email, "Email"),
      EMAIL_RE.test(form.email.trim()) ? undefined : "Email must be valid",
    );
    if (email) next.email = email;
    if (form.password.length < 8 || form.password.length > 72)
      next.password = "Password must be between 8 and 72 characters";
    else if (!PASSWORD_RE.test(form.password)) next.password = "Password must contain letters and numbers";
    if (form.confirm !== form.password) next.confirm = "Passwords do not match";
    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await register(form.fullName.trim(), form.email.trim(), form.password);
      router.replace("/employees");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.message);
      } else {
        setFormError("Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const field = (key: keyof typeof form, label: string, type: string, autoComplete: string) => (
    <div className="field">
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        type={type}
        autoComplete={autoComplete}
        className={`input${errors[key] ? " invalid" : ""}`}
        value={form[key]}
        onChange={set(key)}
      />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create account</h1>
        <p className="subtitle">New accounts get the standard User role.</p>

        {formError && <div className="alert alert-error">{formError}</div>}

        {field("fullName", "Full name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        {field("confirm", "Confirm password", "password", "new-password")}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
