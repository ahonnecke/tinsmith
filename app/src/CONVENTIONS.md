# Code Conventions

This file documents the canonical patterns used in this codebase. When an LLM
generates new code, it should follow these patterns. Deviations should be
explicitly commented with a reason.

## Data Fetching

**Rule: Server components fetch data via domain queries. API routes handle client-side mutations.**

- **Server components** (`page.tsx` without `'use client'`) import query functions
  from `@/domains/*/queries` and pass data as props to client components.
  They authenticate via `getCurrentUser()` from `@/domains/auth/jwt`.

- **API routes** (`route.ts`) exist for operations triggered by user interaction
  in client components: creating, updating, deleting records, running calculations.
  All use the `withAuth()` wrapper from `@/lib/with-auth`.

- **Client components** (`'use client'`) call API routes via `fetch()` for mutations
  and receive initial data as props from their parent server component.

Do NOT fetch API routes from server components. Do NOT query the database from
client components.

## Authentication

Every protected API route uses `withAuth()`:

```typescript
export const GET = withAuth(async (req, { params }, user) => {
  // user is guaranteed non-null
});
```

Server components call `getCurrentUser()` directly and redirect to login if null.

## API Response Shape

All API routes return `ApiResult<T>` from `@/lib/api-result`:

```typescript
{ ok: true, data: T }           // success
{ ok: false, error: string, code: ErrorCode }  // failure
```

Use the helpers: `ok()`, `created()`, `badRequest()`, `notFound()`, `unauthorized()`,
`unprocessable()`, `upstreamError()`, `serverError()`.

## Request Validation

POST/PUT routes validate request bodies with Zod schemas via `validateBody()`:

```typescript
const parsed = validateBody(CreateProjectSchema, body);
if (!parsed.ok) return parsed.response;
// parsed.data is typed
```

Schemas live in `@/domains/*/schemas.ts`.

## Domain Organization

Code is organized by domain under `src/domains/`:

```
domains/
  auth/         types, jwt, queries, schemas
  projects/     types, queries, schemas
  units/        types, queries, schemas
  equipment/    types, queries, selection engine
  calculations/ types, queries, schemas
  weather/      types
  audit/        queries
  shared/       utilities (jsonb parsing)
```

`src/lib/` files are barrel re-exports for backward compatibility.
New code should import from `@/domains/*` directly.
