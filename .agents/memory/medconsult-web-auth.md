---
name: MedConsult web auth path
description: How authenticated API calls actually authenticate in the MedConsult React web app
---

# MedConsult web auth: Bearer token, not cookies

Authenticated `/api/*` calls in the MedConsult web frontend authenticate via a
**Clerk Bearer token**, attached by `customFetch` because `App.tsx` calls
`setAuthTokenGetter(() => getToken())`. Every generated React Query hook goes
through `customFetch`, so they "just work".

**Why this is a trap:** `lib/api-client-react/src/custom-fetch.ts` has a comment
saying `setAuthTokenGetter` should never be used in web apps because cookies are
sent automatically. In THIS app that comment does not hold — cookies do NOT
authenticate. A plain `fetch(url, { credentials: "include" })` or an
`<img src="/api/storage/...">` to an authenticated route returns **401**.
`getToken()` works fine for token retrieval (an earlier "307 redirect loop"
diagnosis was a misdiagnosis; the real failure mode is a clean 401).

**How to apply:** For any non-hook authenticated API request (e.g. binary/blob
downloads like the event schedule PDF), use the exported `customFetch` from
`@workspace/api-client-react` with `{ responseType: "blob" }` — do NOT hand-roll
a `fetch` with cookies or manually pass a Bearer header. `customFetch` is
exported from the package index alongside `setBaseUrl`/`setAuthTokenGetter`.

**Public vs authenticated routes:** `GET /api/events`, `/api/events/:id`,
`/api/agencies` are PUBLIC (mounted before `requireAuth` in
`artifacts/api-server/src/routes/index.ts`) and return 200 without auth — do not
use their success as proof that auth works. Test auth with routes mounted after
`requireAuth`/`requireUser` (e.g. `/api/customers`, `/api/storage/objects/...`).

**Server note:** the API server workflow (`pnpm run dev`) builds once and does
NOT hot-reload route file changes — restart the workflow after editing routes.
