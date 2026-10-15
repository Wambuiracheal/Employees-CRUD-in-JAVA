# Design decisions and assumptions

## Scope and assumptions

| Topic | Assumption / decision |
|-------|-----------------------|
| Record type | **Employees**, with name, email, phone, department, job title, salary, hire date and status (`ACTIVE`, `ON_LEAVE`, `TERMINATED`). These cover text, numeric, date and enum fields, which exercises validation and sorting. |
| Role permissions | The brief asks for two roles but doesn't say what each can do. I chose: **USER** can view, search, create, update and export employees. **ADMIN** can do all of that, plus **delete** employees and **manage user roles**. Delete is the destructive operation, so it is the one that is restricted. |
| Registration | Anyone can self-register, and new accounts always get `USER`. Admins come from the seed or are promoted by an existing admin. The last admin cannot be demoted, so the system can't end up locked out. |
| Departments | Free text with autocomplete from existing values, not a separate table. This keeps the CRUD module focused on one entity; the next step would be a `departments` table with a foreign key. |
| Currency | Salary is stored as `NUMERIC(12,2)` with no currency. A single currency is assumed. |
| Export scope | Export returns **all rows matching the current search, filters and sort**, not just the visible page, because that's what users usually expect from "export what I'm looking at". |

## Backend

**Layering.** Each feature package (`employee`, `user`, `auth`) contains controller → service → repository. DTOs are Java records (`EmployeeRequest`, `EmployeeResponse`), so JPA entities are never serialised directly. That prevents leaking fields like `passwordHash` and keeps the API contract independent of the schema.

**Schema ownership.** Flyway owns the schema and Hibernate runs with `ddl-auto: validate`, so a mismatch between entity and table fails at startup instead of being silently "fixed". The migrations use standard SQL (identity columns, CHECK constraints), so the same scripts run on PostgreSQL in production and on H2 in tests.

**Validation in three places:**
1. Bean Validation on request records gives field-level messages and a 400.
2. Service checks enforce business rules: email uniqueness gives a 409, and the sort-field whitelist and page-size bounds give a 400.
3. Database constraints (`UNIQUE`, `CHECK salary >= 0`, `CHECK status IN …`) are the last line of defence. If a race gets past step 2, `DataIntegrityViolationException` is still mapped to a 409.

**Search, filter, sort, paging.** Search and filters are composed with JPA `Specification`s: a case-insensitive "contains" match on full name, email, department and job title, plus exact status and department filters. The same specification serves both the list and export endpoints. Sorting is limited to a **whitelist** of fields, so arbitrary property paths never reach the query builder. A secondary sort on `id` keeps paging stable when values tie. Page size is capped at 100. Responses use an explicit `PageResponse` envelope instead of serialising Spring's `Page`, whose JSON shape isn't a stable contract.

**Optimistic locking.** `Employee` has a `@Version` column. The client sends back the `version` it loaded. If someone else saved in between, the API returns **409** instead of silently overwriting their change. `version` is optional in the request, so simple API clients still work.

**Errors.** A single `@RestControllerAdvice` maps exceptions to one JSON shape (`timestamp, status, error, message, path, fieldErrors`). The security layer's 401/403 responses (`JsonSecurityErrorHandler`) use the same shape, so the frontend handles every error the same way. Unexpected errors return a generic 500 message; the stack trace only goes to the logs.

**Export.** CSV is written by hand. The format is simple, and this avoids a dependency. It follows RFC 4180 quoting, adds a UTF-8 BOM so Excel opens non-ASCII names correctly, and protects against **CSV formula injection**: cells starting with `= @ + -` are prefixed with `'`, except numeric-looking values such as phone numbers like `+2547…`. JSON export uses Jackson. Both use `Content-Disposition: attachment` with a timestamped filename.

## Security

- **Stateless JWT (HS256 family) via jjwt.** The token carries the email (`sub`), role and user id, and expires after 120 minutes by default. CSRF protection is disabled because there are no cookies or sessions. That is safe only because the token travels in the `Authorization` header.
- **Per-request user lookup.** The JWT filter reloads the user from the database on each request. This costs one indexed query, but role changes and deleted accounts take effect immediately instead of when the token expires.
- **Two layers of authorisation.** URL rules in `SecurityConfig` require authentication for everything except login, register and health. Method-level `@PreAuthorize("hasRole('ADMIN')")` protects delete and user management. The frontend also hides admin-only controls, but only for UX; the API is the actual enforcement point.
- **Passwords.** Hashed with BCrypt. Registration requires 8–72 characters with letters and digits (72 is BCrypt's input limit).
- **Configuration and secrets.** The JWT secret, DB password and seed-account passwords have **no defaults in the code or the repository**. They come from environment variables, supplied by a git-ignored `.env` file for Docker Compose (template: `.env.example`). The app fails fast if `JWT_SECRET` or `DB_PASSWORD` is missing, and Compose names any missing variable. Tests use separate throwaway values.
- **CORS.** Restricted to the configured frontend origin, and `Content-Disposition` is exposed so the browser can read the export filename.

**Known trade-off:** the frontend stores the JWT in `localStorage`. That's simple and works across tabs, but any XSS on the origin could read it. A production system would use an `HttpOnly`, `SameSite` cookie (re-enabling CSRF protection) or short-lived access tokens with refresh tokens. Logout is client-side only; there's no token revocation list.

## Frontend

- **Next.js App Router with client components.** Every page depends on the signed-in user and live API data, so server rendering adds little. The API base URL comes from `NEXT_PUBLIC_API_URL`.
- **Plain CSS** in one `globals.css`, using CSS custom properties as design tokens and BEM-ish class names. No CSS framework or component library, per the brief.
- **`lib/api.ts`** is the single place that attaches the token, parses error bodies into an `ApiError` (with `fieldErrors`), and triggers a global logout on 401 with an "expired" banner.
- **Table state** (search, filters, sort, page, size) lives in one query object. Search is debounced by 300 ms, and in-flight requests are cancelled with `AbortController` so stale responses can't overwrite newer ones. Changing a filter resets to page 1. If a delete empties the current page, the view steps back a page.
- **Form validation** mirrors the backend rules. It runs on blur, on change once a field has been touched, and on submit. Server-side field errors are mapped onto the same inputs, so rules enforced only by the server (like duplicate email) appear next to the field too.
- **Accessibility:** labelled inputs, `aria-sort` on sortable headers, `aria-invalid` on invalid fields, focus handling and Escape-to-close on dialogs, and an `aria-live` toast.

## Testing

Integration tests (`*ApiTest`) start the full application context with MockMvc. They go through the real security filter chain, obtain real JWTs from `/api/auth/login`, and run against H2 in PostgreSQL mode after the real Flyway migrations are applied. Each test runs in a rolled-back transaction. I chose H2 over Testcontainers so the suite runs anywhere without Docker. The trade-off is less fidelity to PostgreSQL; the stack was also checked end to end against PostgreSQL 16 through Docker Compose.

## What I would add next

- Refresh tokens or `HttpOnly` cookie sessions, plus login rate limiting
- Testcontainers-based tests against real PostgreSQL, and frontend component tests (e.g. Vitest + Testing Library)
- An OpenAPI/Swagger UI generated from the controllers
- Streaming export for very large result sets (currently loaded into memory)
- Soft delete with an audit trail of who changed what
- Search and filter state kept in the URL so views can be shared

## Tooling note

This project was built with help from an AI coding assistant (Claude Code), which was used for scaffolding, implementation and tests. The commit history shows the order in which the work was done.
