import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function TechnicalReference() {
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
            <h1 className="text-2xl font-bold text-gray-900">Technical Reference</h1>
            <p className="text-sm text-gray-500 mt-1">
              External API &amp; Webhook integration guide — print or save as PDF
            </p>
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-[#145c4b] hover:bg-[#0f4538]">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        <div className="print-page bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* ── Header ── */}
          <div style={{ background: "linear-gradient(135deg, #145c4b 0%, #1a7a63 100%)", padding: "32px 40px" }}>
            <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>
              MedConsult — Technical Reference
            </h1>
            <p style={{ color: "#a7f3d0", fontSize: 13, marginTop: 6 }}>
              External API &amp; Outbound Webhook Integration Guide
            </p>
            <p style={{ color: "#6ee7b7", fontSize: 12, marginTop: 4 }}>
              https://medical-visit-manager--amswatton.replit.app
            </p>
          </div>

          <div style={{ padding: "32px 40px", fontFamily: "system-ui, sans-serif" }}>

            {/* ── TOC ── */}
            <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#145c4b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Contents</p>
              <ol style={{ fontSize: 13, color: "#145c4b", paddingLeft: 18, margin: 0, lineHeight: 2 }}>
                <li>Project Overview &amp; Technology Stack</li>
                <li>External API — Register Customers</li>
                <li>Outbound Webhooks — Real-time Events</li>
                <li>Verifying Webhook Signatures</li>
                <li>Response Codes &amp; Error Handling</li>
                <li>Environment Variables Quick Reference</li>
              </ol>
            </div>

            {/* ── 1. Overview ── */}
            <Section title="1. Project Overview &amp; Technology Stack">
              <p style={p}>
                <strong>MedConsult</strong> is a multi-tenant Surgeon Consultation Management platform. Two agencies are
                configured: <strong>Premier Medical Group</strong> (GBP) and <strong>Beespoke-Med-Istanbul</strong> (EUR).
              </p>
              <Table
                head={["Layer", "Technology"]}
                rows={[
                  ["Frontend", "React + Vite, TypeScript, Wouter, shadcn/ui, TanStack React Query"],
                  ["Auth", "Clerk (multi-tenant sign-in / sign-up)"],
                  ["Backend", "Express 5, Pino structured logging, Zod validation"],
                  ["Database", "Drizzle ORM + PostgreSQL"],
                  ["Email", "Resend API — branded per-agency templates"],
                  ["Storage", "Google Cloud Object Storage (logos, files)"],
                  ["API Contracts", "OpenAPI YAML → Orval codegen (React Query hooks + Zod validators)"],
                ]}
              />
            </Section>

            {/* ── 2. External API ── */}
            <Section title="2. External API — Register Customers">
              <p style={p}>
                Allows the Beespoke-Med-Istanbul booking website to add customers directly into MedConsult when someone registers.
              </p>
              <InfoBox colour="green">
                <strong>Endpoint:</strong> <Code>POST /api/public/customers</Code><br />
                <strong>Authentication:</strong> <Code>X-API-Key: &lt;your-api-key&gt;</Code> request header<br />
                <strong>No login session required</strong> — machine-to-machine call from your booking server
              </InfoBox>

              <h3 style={h3}>Getting the API Key</h3>
              <ol style={{ fontSize: 13, color: "#374151", paddingLeft: 20, lineHeight: 2 }}>
                <li>Log in to MedConsult → <strong>Agencies</strong></li>
                <li>Click <strong>Edit</strong> next to Beespoke-Med-Istanbul</li>
                <li>Scroll to <strong>External API Integration</strong></li>
                <li>Click <strong>Generate Key</strong>, reveal with the eye icon, then copy</li>
                <li>Store as <Code>MEDCONSULT_API_KEY</Code> in your booking app's environment variables</li>
              </ol>

              <h3 style={h3}>Example — curl</h3>
              <Pre>{`curl -X POST https://medical-visit-manager--amswatton.replit.app/api/public/customers \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+90532123456",
    "dialingCode": "+90",
    "nationality": "Turkish",
    "medicalServicesInterest": "Dental Implants"
  }'`}</Pre>

              <h3 style={h3}>Example — JavaScript / Node.js</h3>
              <Pre>{`const response = await fetch(
  'https://medical-visit-manager--amswatton.replit.app/api/public/customers',
  {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.MEDCONSULT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: customer.firstName,
      lastName:  customer.lastName,
      email:     customer.email,
      phone:     customer.phone,
      nationality: customer.nationality,
      medicalServicesInterest: eventCategory,
    }),
  }
);

if (response.status === 409) {
  const { customerId } = await response.json(); // customer already exists
} else if (response.ok) {
  const newCustomer = await response.json();
  console.log('Created customer ID:', newCustomer.id);
}`}</Pre>

              <h3 style={h3}>Accepted fields</h3>
              <Table
                head={["Field", "Type", "Required", "Notes"]}
                rows={[
                  ["firstName", "string", "✓", ""],
                  ["lastName", "string", "✓", ""],
                  ["email", "string", "", "Triggers branded welcome email if provided"],
                  ["phone", "string", "", ""],
                  ["dialingCode", "string", "", 'e.g. "+90"'],
                  ["nationality", "string", "", ""],
                  ["address", "string", "", ""],
                  ["postcode", "string", "", ""],
                  ["preferredLanguage", "string", "", ""],
                  ["medicalServicesInterest", "string", "", ""],
                  ["heightCm", "number", "", ""],
                  ["weightKg", "number", "", ""],
                  ["heightUnit", "string", "", '"cm" or "ft"'],
                  ["weightUnit", "string", "", '"kg" or "lbs"'],
                ]}
              />

              <h3 style={h3}>Response codes</h3>
              <Table
                head={["Code", "Meaning", "What to do"]}
                rows={[
                  ["201 Created", "Customer created", "Response body is the full customer record including id"],
                  ["400 Bad Request", "Validation error", "Check field names and types in your request"],
                  ["401 Unauthorized", "Invalid or missing API key", "Check the X-API-Key header; regenerate in agency settings"],
                  ["409 Conflict", "Email already exists", 'Response: { "customerId": 42 } — link new booking to existing record'],
                ]}
              />
            </Section>

            {/* ── 3. Webhooks ── */}
            <Section title="3. Outbound Webhooks — Real-time Events">
              <p style={p}>
                MedConsult pushes real-time JSON notifications to your configured URL whenever key events occur.
                Your booking site can react instantly — update a dashboard, send an SMS, trigger a workflow.
              </p>

              <h3 style={h3}>Setting up the webhook</h3>
              <ol style={{ fontSize: 13, color: "#374151", paddingLeft: 20, lineHeight: 2 }}>
                <li>Go to <strong>Agencies → Edit Beespoke-Med-Istanbul → External API Integration → Outbound Webhook</strong></li>
                <li>Enter your webhook URL (e.g. <Code>https://www.beespoke-med-istanbul.com/webhooks/medconsult</Code>) and click <strong>Save</strong></li>
                <li>Click <strong>Generate Secret</strong> and store the value as <Code>MEDCONSULT_WEBHOOK_SECRET</Code></li>
              </ol>

              <h3 style={h3}>Events delivered</h3>
              <Table
                head={["Event type", "When it fires", "Key data"]}
                rows={[
                  ["customer.registered", "Customer created via public API", "customerId, firstName, lastName, email, medicalServicesInterest"],
                  ["appointment.created", "New appointment booked", "appointmentId, customerId, surgeonId, startTime, status, fee"],
                  ["appointment.status_changed", "Status: confirmed / cancelled / completed / no-show", "appointmentId, status, previousStatus, customer"],
                  ["appointment.rescheduled", "Appointment date/time moved", "appointmentId, startTime, previousStartTime, customer"],
                ]}
              />

              <h3 style={h3}>Payload structure</h3>
              <Pre>{`{
  "event": "appointment.status_changed",
  "timestamp": "2026-05-03T10:30:00.000Z",
  "agencyId": 2,
  "data": {
    "appointmentId": 42,
    "customerId": 7,
    "surgeonId": 3,
    "startTime": "2026-06-15T09:00:00",
    "endTime":   "2026-06-15T09:30:00",
    "status": "confirmed",
    "previousStatus": "scheduled",
    "fee": 150,
    "customer": {
      "id": 7,
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
}`}</Pre>
            </Section>

            {/* ── 4. Signatures ── */}
            <Section title="4. Verifying Webhook Signatures">
              <p style={p}>
                Every webhook request includes an <Code>X-Webhook-Signature: sha256=&lt;hmac&gt;</Code> header.
                Verify it to confirm the request came from MedConsult and hasn't been tampered with.
                This uses HMAC-SHA256 — the same method used by Stripe, GitHub, and Shopify.
              </p>
              <InfoBox colour="amber">
                <strong>Important:</strong> Always use the <strong>raw request body</strong> (before JSON parsing) when computing the HMAC.
                Formatting changes will break the signature check.
              </InfoBox>

              <h3 style={h3}>Node.js / Express</h3>
              <Pre>{`const crypto = require('crypto');

// Use express.raw() on this route — NOT express.json()
app.post('/webhooks/medconsult',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'];

    const expected = 'sha256=' + crypto
      .createHmac('sha256', process.env.MEDCONSULT_WEBHOOK_SECRET)
      .update(req.body)   // <-- raw Buffer, not parsed JSON
      .digest('hex');

    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(req.body);

    switch (payload.event) {
      case 'customer.registered':   /* add to CRM */          break;
      case 'appointment.created':   /* update booking */      break;
      case 'appointment.status_changed': /* send SMS */       break;
      case 'appointment.rescheduled':    /* update calendar */break;
    }

    res.sendStatus(200); // Respond within 10 seconds
  }
);`}</Pre>

              <h3 style={h3}>PHP / Laravel</h3>
              <Pre>{`Route::post('/webhooks/medconsult', function (Request $request) {
    $signature = $request->header('X-Webhook-Signature');
    $expected  = 'sha256=' . hash_hmac(
        'sha256',
        $request->getContent(),
        config('services.medconsult.webhook_secret')
    );

    if (!hash_equals($expected, $signature)) abort(401);

    $payload = $request->json()->all();
    // handle $payload['event'] ...
    return response('', 200);
});`}</Pre>
            </Section>

            {/* ── 5. Error handling ── */}
            <Section title="5. Response Codes &amp; Error Handling">
              <Table
                head={["Scenario", "Behaviour"]}
                rows={[
                  ["Webhook URL returns 2xx", "Success — logged internally"],
                  ["Webhook URL returns non-2xx", "Warning logged; no automatic retry"],
                  ["Webhook times out (>10 s)", "Warning logged; main API response is unaffected"],
                  ["No webhook URL configured", "Webhook silently skipped"],
                  ["API key regenerated", "Old key stops working immediately — update env var"],
                  ["Webhook secret rotated", "Old secret invalid immediately — update env var"],
                ]}
              />
            </Section>

            {/* ── 6. Quick ref ── */}
            <Section title="6. Environment Variables Quick Reference">
              <InfoBox colour="green">
                <strong>Production URL:</strong> https://medical-visit-manager--amswatton.replit.app<br />
                <strong>API endpoint:</strong> POST /api/public/customers<br />
                <strong>Webhook signature header:</strong> X-Webhook-Signature: sha256=&lt;hmac&gt;<br />
                <strong>Admin panel:</strong> Agencies → Edit Beespoke-Med-Istanbul → External API Integration
              </InfoBox>
              <Table
                head={["Variable name", "Value", "Where to get it"]}
                rows={[
                  ["MEDCONSULT_API_KEY", "64-char hex key", "Agencies → Edit → Generate Key"],
                  ["MEDCONSULT_WEBHOOK_SECRET", "64-char hex secret", "Agencies → Edit → Generate Secret"],
                  ["MEDCONSULT_BASE_URL", "https://medical-visit-manager--amswatton.replit.app", "Fixed — your app's production domain"],
                ]}
              />
            </Section>

          </div>

          <div style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "16px 40px", fontSize: 11, color: "#9ca3af" }}>
            MedConsult Technical Reference · Generated 3 May 2026 · amswatton@hotmail.com
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Small render helpers ── */

const p: React.CSSProperties = { fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 1.65 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#1f2937", margin: "20px 0 8px" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#145c4b",
          margin: "36px 0 14px",
          paddingBottom: 8,
          borderBottom: "2px solid #d1fae5",
        }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: 4,
        padding: "1px 6px",
        fontFamily: "Courier New, monospace",
        fontSize: 12,
        color: "#1f2937",
      }}
    >
      {children}
    </code>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: "#0f2027",
        color: "#c3f6d4",
        borderRadius: 10,
        padding: "18px 22px",
        fontSize: 12,
        lineHeight: 1.7,
        overflowX: "auto",
        whiteSpace: "pre",
        margin: "10px 0",
        border: "1px solid #1a3a30",
      }}
    >
      {children}
    </pre>
  );
}

function InfoBox({ colour, children }: { colour: "green" | "amber" | "blue"; children: React.ReactNode }) {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: "#ecfdf5", border: "1px solid #6ee7b7" },
    amber: { background: "#fffbeb", border: "1px solid #fcd34d" },
    blue:  { background: "#eff6ff", border: "1px solid #93c5fd" },
  };
  return (
    <div style={{ ...styles[colour], borderRadius: 9, padding: "13px 18px", margin: "12px 0", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, margin: "12px 0" }}>
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              style={{
                background: "#f3f4f6",
                textAlign: "left",
                padding: "8px 12px",
                fontWeight: 700,
                border: "1px solid #e5e7eb",
                color: "#374151",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", verticalAlign: "top" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
