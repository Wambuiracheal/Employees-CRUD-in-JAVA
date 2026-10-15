"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { EMAIL_RE } from "@/lib/validation";

function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const expired = useSearchParams().get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/employees");
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Email must be valid";
    if (!password) next.password = "Password is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login(email.trim(), password);
      router.replace("/employees");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Sign in</h1>
        <p className="subtitle">Employee Directory</p>

        {expired && !formError && <div className="alert alert-error">Your session expired. Please sign in again.</div>}
        {formError && <div className="alert alert-error">{formError}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={`input${errors.email ? " invalid" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={`input${errors.password ? " invalid" : ""}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="auth-footer">
          No account? <Link href="/register">Create one</Link>
        </p>

        <div className="demo-credentials">
          <strong>Demo accounts</strong>
          <span>Admin: admin@pesira.com / Admin@123</span>
          <span>User: user@pesira.com / User@1234</span>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary for static rendering.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
