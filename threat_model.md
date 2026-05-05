# Threat Model

## Project Overview

MedConsult is a multi-tenant surgeon consultation management application for medical booking agencies. It uses a React + Vite frontend in `artifacts/medconsult`, an Express 5 API in `artifacts/api-server`, PostgreSQL via Drizzle in `lib/db`, Clerk for user identity, object storage for uploaded assets, and Resend for transactional email.

Production scope for security scanning is the API server, the MedConsult frontend, shared database schema/code, and outbound integrations invoked by production routes. `artifacts/mockup-sandbox` is dev-only and should be ignored unless production reachability is demonstrated. In production, `NODE_ENV` can be assumed to be `production`, and TLS is provided by the platform.

## Assets

- **Patient and customer records** — names, email addresses, phone numbers, addresses, nationality, declaration state, height/weight, appointment history, and other medical-booking data. Exposure would leak sensitive personal and health-adjacent information.
- **Consultation records and attachments** — surgeon notes, questionnaire responses, PDFs, uploaded photos/documents/voice recordings, and consultation status. These are the highest-sensitivity application records.
- **User accounts and roles** — Clerk identities plus local role mappings in `users` (`app_owner`, `admin`, `surgeon`, `customer`). Compromise or spoofing enables privilege escalation across agency data.
- **Tenant configuration and secrets** — agency API keys, webhook URLs/secrets, branding, and email settings. Abuse could expose integrations or let attackers impersonate agencies.
- **Outbound integrations and service credentials** — Resend API key, object-storage credentials via sidecar, and database access. Misuse can cause spam, data exfiltration, or abuse of external services.

## Trust Boundaries

- **Browser/mobile client to API** — every `/api` request crosses from an untrusted client into the backend. Clerk on the frontend is not a security boundary; the API must authenticate and authorize each sensitive action itself.
- **Public/external callers to API-key routes** — `/api/public/*` style integrations accept third-party requests using an agency API key. These routes must be narrowly scoped and isolated from authenticated admin/surgeon/customer capabilities.
- **API to database** — the API has direct access to all tenant and medical data. Broken authorization or IDOR at the API layer becomes full cross-tenant data exposure.
- **API to object storage** — uploaded consultation files and logos cross into object storage. Object retrieval endpoints must enforce ownership/role checks for private objects.
- **API to external services** — email, webhook delivery, and any server-side fetches cross into third-party or attacker-controlled infrastructure. These paths need abuse prevention, origin control, and timeouts.
- **Authenticated role boundaries** — admin/app owner, surgeon, customer, and unauthenticated/public users must be separated server-side. Frontend routing alone is not sufficient.
- **Tenant boundary** — agency data must stay isolated by agency and, within an agency, by the current user’s role and ownership relationships.

## Scan Anchors

- **Production server entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`
- **Highest-risk code areas:** `artifacts/api-server/src/routes/{users,agencies,customers,appointments,consultations,questionnaires,storage,email-preview,public-customers}.ts`
- **Public surfaces:** frontend `/events`, `/events/:id`, `/register`; API `/api/health*`; explicit external integration route `/api/public/customers`
- **Authenticated surfaces:** frontend `/admin/*`, `/surgeon/*`, `/portal/*`; corresponding backend business routes must enforce auth and authorization independently
- **Dev-only areas:** `artifacts/mockup-sandbox`, generated `dist/` outputs unless needed as build evidence

## Threat Categories

### Spoofing

The system uses Clerk to attach user identity, but the API must treat identity as absent unless a valid authenticated session is present on the request. All routes that read or mutate agency, surgeon, customer, appointment, questionnaire, consultation, email-log, reminder, or storage-backed medical data MUST require a valid authenticated identity unless they are explicitly designed as public integration endpoints. Public API-key routes MUST be scoped only to the owning agency and MUST NOT provide admin-equivalent access.

### Tampering

Attackers must not be able to create, edit, delete, or complete appointments, customers, consultation records, questionnaires, reminder settings, or agency configuration without the correct role and tenant ownership. The backend MUST enforce role checks and object-level ownership checks server-side. Client-side route grouping or redirects MUST NOT be relied on to protect business actions.

### Information Disclosure

Medical and booking data is especially sensitive in this project. API responses, PDFs, questionnaire answers, email logs, and object-storage downloads MUST be scoped to the authenticated user’s role and tenant. Private consultation media and generated reports MUST NOT be fetchable through guessable IDs or direct object paths. Errors and logs MUST avoid exposing secrets, raw credentials, or unnecessary patient data.

### Denial of Service

Publicly reachable endpoints that send emails, generate PDFs, create uploads, or trigger external webhooks can be abused to consume resources or create billing/spam events. Sensitive side-effecting routes MUST require authorization, and public routes SHOULD have narrow scope and rate limiting. Server-side external requests MUST use bounded timeouts and avoid attacker-driven fan-out.

### Elevation of Privilege

This application has strong privilege gradients: public user, customer, surgeon, admin, and app owner. The backend MUST enforce these transitions explicitly. A regular or unauthenticated caller MUST NOT be able to self-provision a privileged local user record, read or modify another tenant’s objects, regenerate agency secrets, or access consultation attachments and reports outside their relationship to the record.

### Repudiation

Administrative and medically sensitive actions such as changing appointments, updating consultation notes, sending reminders, regenerating agency secrets, and exporting PDFs should be attributable to a concrete actor. Request logging is helpful context but is not sufficient if sensitive routes are callable without verified identity. Sensitive operations MUST be tied to authenticated users where applicable so audit logs remain meaningful.
