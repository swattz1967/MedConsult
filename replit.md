# MedConsult Workspace

## Overview

Multi-tenant Surgeon Consultation Management web app for Medical Booking Agencies.
pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: Clerk
- **Build**: esbuild (CJS bundle)

## Architecture

- `artifacts/api-server` — Express API (port via PORT env, routes under `/api`)
- `artifacts/medconsult` — React frontend (port via PORT env, preview path `/`)
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`)
- `lib/api-client-react` — Generated React Query hooks (`src/generated/api.ts`)
- `lib/api-zod` — Generated Zod schemas (`src/generated/api.ts`)
- `lib/db` — Drizzle ORM schema + migrations

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Roles

- `app_owner` / `admin` → `/admin` portal (full management)
- `surgeon` → `/surgeon` portal (appointments + consultation room)
- `customer` → `/portal` (appointments, forms, declaration)
- Public → `/events`, `/events/:id`, `/register`

## Seeded Data

- Agency ID 1: Premier Medical Group
- Surgeons: IDs 1-3 (firstName contains "Dr. " prefix in DB)
- Event ID 1: London Consultation Week 2026 (published)
- Customers: IDs 1-3
- Questionnaire templates: IDs 1-3

## Important Notes

- Hook pattern: `useGetThing(id)` — generated hooks have built-in `enabled: !!id` guards
- Do NOT pass `{ query: { enabled: !!id } }` to hooks — it conflicts with the generated UseQueryOptions type
- `CreateSurgeonBody`, `CreateEventBody`, `CreateCustomerBody` all require `agencyId`
- `useListProcedures(surgeonId)` — first arg is a number, not an object
- `useCreateProcedure.mutate({ surgeonId, data })` / `useUpdateProcedure.mutate({ surgeonId, id, data })`
- `useAddConsultationMedia.mutate({ recordId, data })` — note `recordId` not `consultationRecordId`
- `CreateConsultationMediaBody.mediaType` enum: `photo | document | voice_recording` (NOT "image")
- Surgeon firstName in DB already includes "Dr. " — do not prepend in UI
- `useListNationalities/Languages/MedicalServices` returns `ConfigItem[]` — use `.value` and `.label`
- `UserProfile` has `surgeonId` and `customerId` (not nested `.surgeon.id`)
- `QuestionnaireWithQuestions` is a flat object with `.name`, `.type`, `.questions[]` (no `.questionnaire` nesting)
- Config routes require injecting `type` field: `CreateNationalityBody.safeParse({ ...req.body, type: "nationality" })`

## Email Notifications

- Provider: **Resend** (`resend` npm package, `artifacts/api-server/src/lib/email.ts`)
- Secret: `RESEND_API_KEY` (set in Replit Secrets — do NOT use Replit integration connector, use the secret directly)
- Env var: `APP_URL` (shared) — base URL for portal/surgeon links in email bodies
- `EMAIL_FROM` env var (optional) — defaults to `MedConsult <notifications@medconsult.app>`
- Triggers: booking confirmation → customer + surgeon; status change → both parties
- All email sends are fire-and-forget (after HTTP response), failures logged but never throw
- NOTE: Resend integration connector was dismissed by user — use RESEND_API_KEY secret directly

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
