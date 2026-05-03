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
- **i18n**: react-i18next + i18next-browser-languagedetector (en / pt-BR / es)
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

## Multi-Currency

- Agency has `currency` field: `GBP | EUR | TRY` (default `GBP`)
- `lib/currency.ts` — `formatCurrency(amount, currencyCode)` using Intl
- `AgencyContext` (`contexts/AgencyContext.tsx`) — provides `formatCurrency(amount)` bound to current agency
- All monetary displays in customers, customer-detail, and reports use `formatCurrency` from `useAgency()`

## i18n

- Bootstrap: `src/i18n/index.ts` (imported as side-effect in `main.tsx`)
- Languages: `en`, `pt-BR`, `es` — files at `src/i18n/locales/*.json`
- Language stored in localStorage key `medconsult_lang`
- Language switcher dropdown in admin header (`admin-layout.tsx`)
- Translation keys: `nav.*`, `common.*`, `status.*`, `pages.*`, `appointment.*`, `currency.*`, `language.*`

## Multi-Tenant Agency Context

- `AgencyContext` wraps all routes inside `QueryClientProvider` in `App.tsx`
- Provides: `currentAgency`, `agencyId`, `agencies`, `setCurrentAgencyId`, `formatCurrency`, `isLoading`
- Selected agency stored in localStorage key `medconsult_agency_id`
- Agency switcher shown in sidebar when multiple agencies exist
- Sidebar shows agency logo (if set) or name initial + truncated name

## Per-Agency Branding

- `AgencyContext` injects `<style id="mc-brand-vars">` into `document.head` on agency change
- CSS variables injected: `--primary`, `--primary-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--ring`, `--brand-primary`, `--brand-secondary`, `--brand-secondary-hsl`
- Utilities in `src/lib/color.ts`: `hexToHslString`, `isLightColor`, `isValidHex`, `getRelativeLuminance`, `getContrastRatio`, `getWcagLevel`
- Agencies page (`src/pages/admin/agencies.tsx`) has full brand editor:
  - `LogoUpload` — drag-and-drop/click-to-upload via presigned URL to object storage; shows preview + Replace/Remove
  - `ColorPickerInput` — native colour picker swatch + hex input + 10 presets
  - `ContrastBadge` — WCAG 2.1 contrast ratio checker with live "Aa" preview and AA/AAA/Fail badge
  - `BrandPreview` — live card showing logo (or initial avatar) + agency name + colour bar
- Object storage: `lib/object-storage-web` (composite lib) — `useUpload` hook for presigned URL two-step upload
- Logos served at `/api/storage/objects/<path>`; `logoUrl` stored as the full `/api/storage/objects/…` path

## PDF Branding

- Consultation PDF route (`artifacts/api-server/src/routes/consultations.ts`) fetches agency from `event.agencyId`
- Uses `agency.primaryColor` for brand colour (fallback `#1a6b5c`)
- Shows `agency.name` (or logo image if `logoUrl` is set and fetchable) in PDF header
- Footer shows `agency.name — agency.email — Record #id`

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
- TS errors in `objectStorage.ts` and `storage.ts` are pre-existing — always ignore in typecheck output

## Email Notifications

- Provider: **Resend** (`resend` npm package, `artifacts/api-server/src/lib/email.ts`)
- Secret: `RESEND_API_KEY` (set in Replit Secrets — do NOT use Replit integration connector, use the secret directly)
- Env var: `APP_URL` (shared) — base URL for portal/surgeon links in email bodies
- `EMAIL_FROM` env var (optional) — defaults to `MedConsult <notifications@medconsult.app>`
- Triggers: booking confirmation → customer + surgeon; status change → both parties
- All email sends are fire-and-forget (after HTTP response), failures logged but never throw
- NOTE: Resend integration connector was dismissed by user — use RESEND_API_KEY secret directly

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
