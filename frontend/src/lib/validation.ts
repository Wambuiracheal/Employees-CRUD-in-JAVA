// Client-side validation mirrors the backend Bean Validation rules so users get instant
// feedback; the server remains the source of truth and its field errors are shown too.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_RE = /^[\p{L} .'-]+$/u;
export const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function required(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required`;
}

export function maxLength(value: string, max: number, label: string): string | undefined {
  return value.trim().length > max ? `${label} must be at most ${max} characters` : undefined;
}

export function firstError(...checks: (string | undefined)[]): string | undefined {
  return checks.find(Boolean);
}
