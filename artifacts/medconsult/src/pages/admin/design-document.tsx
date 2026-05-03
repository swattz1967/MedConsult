import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function DesignDocument() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; padding: 0 16px !important; }
          h2 { page-break-after: avoid; }
          pre { page-break-inside: avoid; white-space: pre-wrap; word-break: break-all; }
          table { page-break-inside: avoid; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Design Document</h1>
            <p className="text-sm text-gray-500 mt-1">MedConsult · Version 1.0 · May 2026</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-[#145c4b] hover:bg-[#0f4538]">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        <div className="print-page bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "32px 40px" }}>
            <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              Design Document
            </div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>MedConsult</h1>
            <p style={{ color: "#bfdbfe", fontSize: 14, marginTop: 6 }}>System Architecture & Technical Design</p>
            <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[["Version", "1.0"], ["Date", "3 May 2026"], ["Status", "Released"], ["Author", "amswatton@hotmail.com"]].map(([k, v]) => (
                <span key={k} style={{ background: "rgba(255,255,255,0.15)", color: "#dbeafe", fontSize: 12, padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)" }}>
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>

          <div style={{ padding: "32px 40px", fontFamily: "system-ui, sans-serif" }}>

            <Toc items={[
              "Version History",
              "System Architecture Overview",
              "Technology Stack",
              "Monorepo Structure",
              "Database Schema",
              "API Design",
              "Authentication & Authorisation",
              "Frontend Architecture",
              "Email System",
              "File Storage",
              "External API Integration",
              "Outbound Webhook System",
              "Multi-tenancy Design",
              "Deployment Architecture",
              "Security Design",
              "Data Flow Diagrams",
            ]} />

            {/* Version History */}
            <Sec title="Version History" accent="blue">
              <VersionTable rows={[
                ["1.0", "3 May 2026", "amswatton@hotmail.com", "Initial released design. Full architecture, technology stack, DB schema, API design, webhook system, and deployment architecture documented."],
              ]} />
              <AddVersionNote />
            </Sec>

            {/* 1 */}
            <Sec title="1. System Architecture Overview" accent="blue">
              <P>
                MedConsult is built as a <strong>monorepo</strong> containing a React/Vite frontend, an Express
                API server, and shared libraries for the database schema, API specification, and generated client
                code. All services run behind a shared reverse proxy that routes requests by URL path.
              </P>
              <InfoBox>
                <strong>Request flow:</strong> Browser → Replit Proxy (TLS) → Vite dev server (<code style={ic}>/</code>) or Express API server (<code style={ic}>/api</code>)
              </InfoBox>
              <H3>High-level component diagram</H3>
              <Pre>{`┌─────────────────────────────────────────────────────────────────┐
│                      Replit Reverse Proxy (TLS)                  │
│           Routes /api/* → API Server   /*  → Vite Frontend       │
└─────────────────┬───────────────────────────┬────────────────────┘
                  │                           │
         ┌────────▼────────┐       ┌──────────▼──────────┐
         │  Express API     │       │   React + Vite SPA  │
         │  (port 8080)     │       │   (port 5173)       │
         │                 │       │                     │
         │  Routes:        │       │  Pages:             │
         │  /api/agencies  │       │  /admin/**          │
         │  /api/surgeons  │       │  /surgeon/**        │
         │  /api/events    │       │  /portal/**         │
         │  /api/customers │       │  /events/**         │
         │  /api/appts     │       │                     │
         │  /api/public/*  │       │  Auth: Clerk SDK    │
         └────────┬────────┘       └──────────────────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL DB  │
         │   (Drizzle ORM)  │
         └─────────────────┘`}</Pre>
            </Sec>

            {/* 2 */}
            <Sec title="2. Technology Stack" accent="blue">
              <Table
                head={["Layer", "Technology", "Version / Notes"]}
                rows={[
                  ["Runtime", "Node.js", "v20 LTS"],
                  ["Package manager", "pnpm workspaces", "v9"],
                  ["Frontend framework", "React", "v18"],
                  ["Frontend build tool", "Vite", "v5"],
                  ["Frontend routing", "Wouter", "Lightweight SPA router"],
                  ["UI components", "shadcn/ui + Radix UI", "Tailwind CSS v3"],
                  ["Data fetching", "TanStack React Query", "v5"],
                  ["Internationalisation", "react-i18next", "EN, ES, PT-BR, TR"],
                  ["Authentication", "Clerk", "Multi-tenant, PKCE, MFA"],
                  ["Backend framework", "Express", "v5"],
                  ["Backend logging", "Pino", "JSON structured logging"],
                  ["ORM", "Drizzle ORM", "Schema-first, type-safe"],
                  ["Database", "PostgreSQL", "Replit-managed instance"],
                  ["Schema validation", "Zod", "Server-side request validation"],
                  ["API spec", "OpenAPI 3.1 (YAML)", "Contract-first development"],
                  ["Code generation", "Orval", "Generates React Query hooks + Zod validators"],
                  ["Email delivery", "Resend API", "Transactional, branded templates"],
                  ["File storage", "Google Cloud Storage", "Object storage for agency logos"],
                  ["TypeScript", "TypeScript", "v5, strict mode"],
                ]}
              />
            </Sec>

            {/* 3 */}
            <Sec title="3. Monorepo Structure" accent="blue">
              <Pre>{`/
├── artifacts/
│   ├── api-server/          # Express API server
│   │   └── src/
│   │       ├── index.ts     # Entry point, middleware, server bootstrap
│   │       ├── routes/      # Route handlers (one file per resource)
│   │       │   ├── agencies.ts
│   │       │   ├── appointments.ts
│   │       │   ├── customers.ts
│   │       │   ├── events.ts
│   │       │   ├── surgeons.ts
│   │       │   ├── public-customers.ts  # Unauthenticated external API
│   │       │   └── index.ts             # Route registration
│   │       └── lib/
│   │           ├── email.ts       # Resend email helpers
│   │           ├── webhook.ts     # HMAC-signed webhook dispatcher
│   │           └── storage.ts     # GCS object storage helpers
│   │
│   └── medconsult/          # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── admin/   # Admin portal pages
│           │   ├── surgeon/ # Surgeon portal pages
│           │   └── portal/  # Customer self-service portal
│           ├── components/  # Shared UI components
│           ├── contexts/    # React contexts (AgencyContext)
│           ├── hooks/       # Custom React hooks
│           └── i18n/        # Translation files (EN/ES/PT-BR/TR)
│
├── lib/
│   ├── db/                  # Drizzle ORM schema + DB client
│   │   └── src/schema/      # One file per table
│   ├── api-spec/            # OpenAPI YAML + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   └── api-zod/             # Generated Zod validators
│
└── scripts/                 # Utility scripts`}</Pre>

              <H3>Key development commands</H3>
              <Table
                head={["Command", "Purpose"]}
                rows={[
                  ["pnpm --filter @workspace/db run push", "Apply database schema changes (drizzle-kit push)"],
                  ["pnpm --filter @workspace/api-spec run codegen", "Regenerate React Query hooks and Zod validators from OpenAPI spec"],
                  ["pnpm run typecheck", "Full TypeScript check across all packages"],
                  ["pnpm --filter @workspace/api-server run dev", "Start API server in development mode"],
                  ["pnpm --filter @workspace/medconsult run dev", "Start frontend in development mode"],
                ]}
              />
            </Sec>

            {/* 4 */}
            <Sec title="4. Database Schema" accent="blue">
              <P>
                The database uses Drizzle ORM with a schema-first approach. Changes are applied directly with
                <code style={ic}>drizzle-kit push</code> (no migration files). Key tables:
              </P>
              <Table
                head={["Table", "Key columns", "Notes"]}
                rows={[
                  ["agencies", "id, name, email, phone, website, logoObjectKey, primaryColour, secondaryColour, currency, apiKey, webhookUrl, webhookSecret", "Central multi-tenancy root"],
                  ["surgeons", "id, agencyId, firstName, lastName, speciality, email, phone, photoObjectKey, clerkUserId", "Linked to an agency; has Clerk login"],
                  ["events", "id, agencyId, title, description, startDate, endDate, location, status, surgeonIds", "Published events are publicly bookable"],
                  ["customers", "id, agencyId, firstName, lastName, email, phone, dialingCode, nationality, address, postcode, heightCm, weightKg, medicalServicesInterest", "Deduplicated by (agencyId, email)"],
                  ["appointments", "id, agencyId, customerId, surgeonId, eventId, startTime, endTime, status, fee, notes, cancelReason", "Core operational table"],
                  ["questionnaires", "id, agencyId, title, questions (jsonb)", "Template definitions"],
                  ["questionnaire_responses", "id, appointmentId, questionnaireId, responses (jsonb), signedAt, signatureData", "Customer-submitted answers"],
                  ["email_logs", "id, agencyId, recipientEmail, subject, status, sentAt, errorMessage", "Audit trail for all outgoing email"],
                  ["reminder_rules", "id, agencyId, enabled, daysBeforeAppointment, emailType", "Configurable automated reminder schedule"],
                ]}
              />
            </Sec>

            {/* 5 */}
            <Sec title="5. API Design" accent="blue">
              <P>
                The API follows REST conventions. All authenticated routes require a valid Clerk session token in
                the <code style={ic}>Authorization: Bearer &lt;token&gt;</code> header (enforced by Clerk middleware).
                The public customer registration endpoint is exempt.
              </P>
              <H3>Authenticated endpoints (selection)</H3>
              <Table
                head={["Method", "Path", "Description"]}
                rows={[
                  ["GET", "/api/agencies", "List all agencies (App Owner only)"],
                  ["POST", "/api/agencies", "Create a new agency"],
                  ["PATCH", "/api/agencies/:id", "Update agency details"],
                  ["POST", "/api/agencies/:id/regenerate-api-key", "Generate a new API key"],
                  ["POST", "/api/agencies/:id/regenerate-webhook-secret", "Generate a new webhook signing secret"],
                  ["GET", "/api/surgeons", "List surgeons for current agency"],
                  ["GET", "/api/events", "List events for current agency"],
                  ["GET", "/api/customers", "List customers for current agency"],
                  ["POST", "/api/appointments", "Book a new appointment"],
                  ["PATCH", "/api/appointments/:id", "Update appointment (status, reschedule, notes)"],
                  ["GET", "/api/questionnaires", "List questionnaire templates"],
                  ["GET", "/api/email-logs", "List email audit log for current agency"],
                  ["GET", "/api/reports", "Fetch aggregated metrics"],
                ]}
              />
              <H3>Public (unauthenticated) endpoints</H3>
              <Table
                head={["Method", "Path", "Auth", "Description"]}
                rows={[
                  ["POST", "/api/public/customers", "X-API-Key header", "Register a customer from an external system"],
                  ["GET", "/api/portal/appointment/:token", "Appointment token", "Load customer portal for questionnaire"],
                  ["POST", "/api/portal/questionnaire/:id/submit", "Appointment token", "Submit questionnaire responses"],
                  ["GET", "/api/events/:id/public", "None", "Public event detail for booking page"],
                ]}
              />
              <H3>API contract workflow</H3>
              <P>
                All endpoints are defined in <code style={ic}>lib/api-spec/openapi.yaml</code> before implementation.
                Running codegen regenerates typed React Query hooks in <code style={ic}>lib/api-client-react</code> and
                Zod validators in <code style={ic}>lib/api-zod</code>. The server uses the Zod validators directly
                in route handlers; the frontend uses the generated hooks.
              </P>
            </Sec>

            {/* 6 */}
            <Sec title="6. Authentication & Authorisation" accent="blue">
              <P>
                Authentication is fully delegated to <strong>Clerk</strong>. MedConsult does not store passwords.
              </P>
              <Table
                head={["Aspect", "Design decision"]}
                rows={[
                  ["Session validation", "Clerk middleware validates the JWT on every authenticated request server-side"],
                  ["Role storage", "Roles (app_owner, admin, surgeon) are stored in Clerk's publicMetadata and synced to the DB user record"],
                  ["Multi-tenancy isolation", "Every DB query is scoped to agencyId derived from the authenticated user's profile; cross-agency queries are impossible for non-App Owner roles"],
                  ["Surgeon portal", "Surgeons sign in via Clerk and are redirected to /surgeon/**; their clerkUserId is linked to the surgeon record"],
                  ["Customer portal", "Customers do not have accounts; they access their portal via a time-limited signed token sent in the appointment email"],
                  ["External API", "External systems authenticate using a per-agency API key (X-API-Key header); this endpoint sits outside Clerk middleware"],
                ]}
              />
            </Sec>

            {/* 7 */}
            <Sec title="7. Frontend Architecture" accent="blue">
              <H3>Routing</H3>
              <P>
                Client-side routing uses <strong>Wouter</strong>. Route trees are split by role to prevent accidental
                cross-role navigation:
              </P>
              <Pre>{`/ (root)           → HomeRedirect (checks role → /admin or /surgeon or /portal)
/admin/**          → AdminRouter  (requires admin or app_owner role)
/surgeon/**        → SurgeonRouter (requires surgeon role)
/portal/**         → PortalRouter (unauthenticated, token-gated)
/events/**         → Public event pages (unauthenticated)
/sign-in, /sign-up → Clerk hosted UI components`}</Pre>

              <H3>State management</H3>
              <Table
                head={["Concern", "Solution"]}
                rows={[
                  ["Server state (API data)", "TanStack React Query — caches, refetches, and invalidates automatically"],
                  ["Current agency context", "AgencyContext (React Context) — stores the active agency and exposes switchAgency()"],
                  ["Form state", "React Hook Form with Zod resolver for type-safe validation"],
                  ["UI state (dialogs, toasts)", "Local component state; toast via shadcn useToast hook"],
                  ["Language preference", "react-i18next — stored in localStorage, applied globally"],
                ]}
              />

              <H3>Component structure</H3>
              <P>
                Components follow shadcn/ui conventions — all primitive components live in
                <code style={ic}>src/components/ui/</code> and are never modified directly. Business-logic
                components live in <code style={ic}>src/components/admin/</code> (e.g. dialogs for booking,
                cancelling, rescheduling).
              </P>
            </Sec>

            {/* 8 */}
            <Sec title="8. Email System" accent="blue">
              <P>
                All emails are sent via the <strong>Resend API</strong>. There is no SMTP server.
              </P>
              <Table
                head={["Design aspect", "Implementation"]}
                rows={[
                  ["Branding", "emailWrapper() injects agency logo, name, and primary colour into every email. Logos are resolved to absolute https:// URLs using REPLIT_DOMAINS."],
                  ["Templates", "HTML email templates are built in TypeScript as template literal strings. No external template engine."],
                  ["Triggers", "customer.welcome, appointment.confirmation, appointment.reschedule, appointment.cancellation, questionnaire.reminder"],
                  ["Async delivery", "Emails are sent fire-and-forget after the API response is sent. Delivery failures are logged but do not affect the caller."],
                  ["Audit log", "Every send attempt writes a record to the email_logs table with status (sent / failed) and timestamp."],
                  ["Reminders", "A scheduler runs hourly, checks reminder_rules per agency, and sends questionnaire reminder emails for upcoming appointments where the questionnaire is incomplete."],
                  ["From address", "Uses the Resend onboarding@resend.dev sender in development; production requires a verified domain."],
                ]}
              />
            </Sec>

            {/* 9 */}
            <Sec title="9. File Storage" accent="blue">
              <P>
                Agency logos and other uploaded files are stored in <strong>Google Cloud Storage</strong> via Replit
                Object Storage.
              </P>
              <Table
                head={["Aspect", "Design"]}
                rows={[
                  ["Upload flow", "Client calls POST /api/storage/upload → server returns a pre-signed upload URL → client PUTs the file directly to GCS"],
                  ["Serving", "Files are served via GET /api/storage/objects/:key through the API server, which proxies from GCS"],
                  ["Key structure", "Files are stored under agency/<agencyId>/<uuid>.<ext> to ensure isolation"],
                  ["Email resolution", "emailWrapper() converts /api/storage/objects/:key paths to absolute https:// URLs before embedding in email HTML"],
                ]}
              />
            </Sec>

            {/* 10 */}
            <Sec title="10. External API Integration" accent="blue">
              <P>
                The public customer registration endpoint allows external booking systems to push customer data
                into MedConsult without a user session.
              </P>
              <Pre>{`External booking app (Beespoke-Med-Istanbul)
  │
  │  POST /api/public/customers
  │  Headers: X-API-Key: <agency_api_key>
  │  Body:    { firstName, lastName, email, phone, ... }
  │
  ▼
Express API Server
  │
  ├─ 1. Look up agency by apiKey
  ├─ 2. Validate request body (Zod)
  ├─ 3. Check for duplicate (email + agencyId)  →  409 if found
  ├─ 4. INSERT customer record
  ├─ 5. Fire welcome email (async, fire-and-forget)
  ├─ 6. Dispatch webhook: customer.registered (async, fire-and-forget)
  └─ 7. Return 201 { id, firstName, lastName, email, ... }`}</Pre>
            </Sec>

            {/* 11 */}
            <Sec title="11. Outbound Webhook System" accent="blue">
              <P>
                MedConsult dispatches signed HTTP POST requests to a configured URL when key events occur.
              </P>
              <H3>Dispatch flow</H3>
              <Pre>{`Event occurs (e.g. appointment status change)
  │
  ▼
dispatchWebhook(agency, eventType, data)   [lib/webhook.ts]
  │
  ├─ 1. Check agency.webhookUrl is set — skip if not
  ├─ 2. Build payload: { event, timestamp, agencyId, data }
  ├─ 3. Serialise to JSON string
  ├─ 4. Compute HMAC-SHA256(payload, agency.webhookSecret)
  ├─ 5. POST to agency.webhookUrl with headers:
  │      Content-Type: application/json
  │      X-Webhook-Signature: sha256=<hex>
  └─ 6. Log outcome (status code or timeout warning)`}</Pre>

              <H3>Security</H3>
              <Table
                head={["Concern", "Design"]}
                rows={[
                  ["Authenticity", "HMAC-SHA256 signature in X-Webhook-Signature header; receiver verifies using their stored secret"],
                  ["Secret storage", "Webhook secrets are stored in the agencies table; never returned to the frontend after initial generation (masked with ***)"],
                  ["Timeout", "10-second HTTP timeout prevents slow receivers from blocking the event loop"],
                  ["Non-blocking", "All webhook dispatches are fire-and-forget; they never delay the primary API response"],
                  ["Secret rotation", "POST /api/agencies/:id/regenerate-webhook-secret generates a new secret; the old secret is immediately invalidated"],
                ]}
              />
            </Sec>

            {/* 12 */}
            <Sec title="12. Multi-tenancy Design" accent="blue">
              <P>
                Every table with agency-scoped data includes an <code style={ic}>agencyId</code> foreign key. All
                queries are filtered by <code style={ic}>agencyId</code> at the ORM layer. The pattern is:
              </P>
              <Pre>{`// Every authenticated request resolves agencyId from the user's profile
const agencyId = req.user.agencyId;  // set by auth middleware

// All DB queries are scoped:
db.select().from(customers)
  .where(eq(customers.agencyId, agencyId));`}</Pre>
              <P>
                App Owners (role: <code style={ic}>app_owner</code>) bypass the agency filter and can query across
                all agencies — this is enforced at the middleware level, not in individual route handlers.
              </P>
            </Sec>

            {/* 13 */}
            <Sec title="13. Deployment Architecture" accent="blue">
              <Table
                head={["Aspect", "Detail"]}
                rows={[
                  ["Platform", "Replit — cloud-hosted container with persistent disk"],
                  ["Production URL", "https://medical-visit-manager--amswatton.replit.app"],
                  ["Proxy", "Replit's built-in reverse proxy handles TLS termination and path-based routing"],
                  ["API server path", "/api/* → Express server on port 8080"],
                  ["Frontend path", "/* → Vite dev server (development) or static build (production)"],
                  ["Database", "Replit-managed PostgreSQL — connection via DATABASE_URL environment variable"],
                  ["Secrets", "All secrets (Clerk keys, Resend key, GCS credentials) stored as Replit environment secrets"],
                  ["Deployment trigger", "Replit Deployments — builds the frontend with Vite, starts the Express server"],
                ]}
              />
            </Sec>

            {/* 14 */}
            <Sec title="14. Security Design" accent="blue">
              <Table
                head={["Threat", "Mitigation"]}
                rows={[
                  ["Unauthenticated API access", "Clerk middleware rejects all requests without a valid JWT on authenticated routes"],
                  ["Cross-agency data access", "All DB queries filtered by agencyId; App Owner role required for cross-agency operations"],
                  ["API key brute force", "Keys are 64-char hex (256-bit entropy); rate limiting can be added at proxy level"],
                  ["Webhook forgery", "Receiver must verify HMAC-SHA256 signature; requests without valid signature should be rejected"],
                  ["SQL injection", "Drizzle ORM uses parameterised queries exclusively; no raw SQL string interpolation"],
                  ["XSS", "React's JSX escaping prevents reflected XSS; Content-Security-Policy headers recommended for production"],
                  ["Secret exposure", "Secrets are stored as environment variables, never in source code; API keys and webhook secrets are masked in the UI after initial display"],
                  ["TLS", "All traffic encrypted by Replit's reverse proxy; HTTP requests are redirected to HTTPS"],
                ]}
              />
            </Sec>

            {/* 15 */}
            <Sec title="15. Data Flow Diagrams" accent="blue">
              <H3>Customer registration via external API</H3>
              <Pre>{`Beespoke Site ──POST /api/public/customers──▶ API Server
                    (X-API-Key header)              │
                                                    ├──▶ DB: lookup agency by apiKey
                                                    ├──▶ Zod: validate body
                                                    ├──▶ DB: check duplicate email
                                                    ├──▶ DB: insert customer
                                                    ├──▶ Resend: send welcome email    (async)
                                                    ├──▶ Webhook: customer.registered  (async)
                                                    └──▶ 201 { id, name, email }`}</Pre>

              <H3>Appointment booking & notification</H3>
              <Pre>{`Admin UI ──POST /api/appointments──▶ API Server
                                              │
                                              ├──▶ DB: insert appointment
                                              ├──▶ Resend: booking confirmation email  (async)
                                              ├──▶ Webhook: appointment.created        (async)
                                              └──▶ 201 { appointment }`}</Pre>

              <H3>Customer portal flow</H3>
              <Pre>{`Customer receives email with portal link
  │
  ▼
GET /portal?token=<signed-jwt>
  │
  ├──▶ API validates token → resolves appointment
  ├──▶ Customer completes questionnaire form
  ├──▶ POST /api/portal/questionnaire/:id/submit
  ├──▶ Customer signs declaration (canvas signature)
  └──▶ Record marked as complete in DB
              │
              ▼
Surgeon sees completed status in consultation room`}</Pre>
            </Sec>

          </div>

          <Footer doc="Design Document" version="1.0" />
        </div>
      </div>
    </>
  );
}

/* ── Shared helpers ── */
const ic: React.CSSProperties = { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4, padding: "1px 5px", fontFamily: "Courier New, monospace", fontSize: 12 };

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 1.65 }}>{children}</p>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", margin: "20px 0 8px" }}>{children}</h3>;
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e40af", margin: "36px 0 14px", paddingBottom: 8, borderBottom: "2px solid #dbeafe" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
function Toc({ items }: { items: string[] }) {
  return (
    <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Contents</p>
      <ol style={{ fontSize: 13, color: "#1e40af", paddingLeft: 18, margin: 0, lineHeight: 2 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ol>
    </div>
  );
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, margin: "12px 0" }}>
      <thead>
        <tr>{head.map(h => <th key={h} style={{ background: "#f3f4f6", textAlign: "left", padding: "8px 12px", fontWeight: 700, border: "1px solid #e5e7eb", color: "#374151" }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
            {row.map((cell, j) => <td key={j} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", verticalAlign: "top" }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Pre({ children }: { children: string }) {
  return (
    <pre style={{ background: "#0f172a", color: "#bfdbfe", borderRadius: 10, padding: "18px 22px", fontSize: 12, lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre", margin: "10px 0", border: "1px solid #1e3a5f" }}>
      {children}
    </pre>
  );
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 9, padding: "13px 18px", margin: "12px 0", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}
function VersionTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, margin: "12px 0" }}>
      <thead>
        <tr>
          {["Version", "Date", "Author", "Summary of Changes"].map(h => (
            <th key={h} style={{ background: "#f3f4f6", textAlign: "left", padding: "8px 12px", fontWeight: 700, border: "1px solid #e5e7eb", color: "#374151", width: h === "Version" ? 80 : h === "Date" ? 110 : h === "Author" ? 200 : "auto" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([ver, date, author, summary], i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", fontFamily: "monospace", fontWeight: 700, color: "#1e40af" }}>{ver}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{date}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{author}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function AddVersionNote() {
  return (
    <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#92400e", marginTop: 10 }}>
      <strong>How to update:</strong> When changes are made to this document, increment the version number, record today's date, add your name, and write a concise summary of what changed in the row above. Older entries remain in the table for full audit history.
    </div>
  );
}
function Footer({ doc, version }: { doc: string; version: string }) {
  return (
    <div style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "16px 40px", fontSize: 11, color: "#9ca3af" }}>
      MedConsult · {doc} · Version {version} · 3 May 2026 · amswatton@hotmail.com
    </div>
  );
}
