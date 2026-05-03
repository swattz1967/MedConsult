import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function UserRequirementSpec() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; padding: 0 16px !important; }
          h2 { page-break-after: avoid; }
          pre { page-break-inside: avoid; }
          table { page-break-inside: avoid; }
          .req-block { page-break-inside: avoid; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Requirement Specification</h1>
            <p className="text-sm text-gray-500 mt-1">MedConsult · Version 1.0 · May 2026</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-[#145c4b] hover:bg-[#0f4538]">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        <div className="print-page bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <div style={{ background: "linear-gradient(135deg, #145c4b 0%, #1a7a63 100%)", padding: "32px 40px" }}>
            <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              User Requirement Specification
            </div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>MedConsult</h1>
            <p style={{ color: "#a7f3d0", fontSize: 14, marginTop: 6 }}>
              Surgeon Consultation Management Platform
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[["Version", "1.0"], ["Date", "3 May 2026"], ["Status", "Approved"], ["Author", "amswatton@hotmail.com"]].map(([k, v]) => (
                <span key={k} style={{ background: "rgba(255,255,255,0.15)", color: "#d1fae5", fontSize: 12, padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)" }}>
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>

          <div style={{ padding: "32px 40px", fontFamily: "system-ui, sans-serif" }}>

            {/* TOC */}
            <Toc items={[
              "Version History",
              "Introduction & Purpose",
              "Stakeholders & User Roles",
              "System Overview",
              "Functional Requirements — Agency Management",
              "Functional Requirements — Surgeon Management",
              "Functional Requirements — Event Management",
              "Functional Requirements — Customer Management",
              "Functional Requirements — Appointments & Consultations",
              "Functional Requirements — Questionnaires",
              "Functional Requirements — Notifications & Email",
              "Functional Requirements — External API & Webhooks",
              "Functional Requirements — Reports & Analytics",
              "Non-Functional Requirements",
              "Constraints & Assumptions",
              "Glossary",
            ]} />

            {/* Version History */}
            <Sec title="Version History">
              <VersionTable rows={[
                ["1.0", "3 May 2026", "amswatton@hotmail.com", "Initial approved release. All functional and non-functional requirements baselined."],
              ]} />
              <AddVersionNote />
            </Sec>

            {/* 1 */}
            <Sec title="1. Introduction & Purpose">
              <P>
                This User Requirement Specification (URS) defines the requirements for <strong>MedConsult</strong>, a
                multi-tenant web application that manages the end-to-end workflow of surgeon consultations across one
                or more medical agencies.
              </P>
              <P>
                The document serves as the authoritative reference for what the system must do. It is intended for
                use by developers, testers, and stakeholders to verify that the delivered system meets all agreed
                requirements.
              </P>
              <H3>1.1 Scope</H3>
              <P>MedConsult covers the following business processes:</P>
              <ul style={ul}>
                <li>Multi-agency onboarding and configuration</li>
                <li>Surgeon and event management</li>
                <li>Customer registration and profiling</li>
                <li>Appointment booking, rescheduling, and lifecycle management</li>
                <li>Pre-consultation questionnaires and medical declarations</li>
                <li>Automated and manual email communications</li>
                <li>External booking-site integration via REST API and outbound webhooks</li>
                <li>Reporting and analytics</li>
              </ul>
              <H3>1.2 Out of Scope</H3>
              <ul style={ul}>
                <li>Clinical notes or electronic health records (EHR)</li>
                <li>Payment processing</li>
                <li>Video conferencing (integrated externally)</li>
                <li>Mobile native applications</li>
              </ul>
            </Sec>

            {/* 2 */}
            <Sec title="2. Stakeholders & User Roles">
              <Table
                head={["Role", "Description", "Access level"]}
                rows={[
                  ["App Owner", "Platform administrator with full access to all agencies and system-wide configuration", "Full — all agencies, all settings"],
                  ["Agency Admin", "Manages surgeons, events, customers, and appointments within their own agency", "Full within their agency only"],
                  ["Surgeon", "Views their schedule and conducts consultations; restricted read-only access to patient info", "Own appointments & consultation room"],
                  ["Customer / Patient", "Self-service portal for completing questionnaires and pre-consultation declarations", "Own records only (via secure portal link)"],
                  ["External System", "Third-party booking websites (e.g. Beespoke-Med-Istanbul) that integrate via API key", "Restricted: register customers only"],
                ]}
              />
            </Sec>

            {/* 3 */}
            <Sec title="3. System Overview">
              <P>
                MedConsult is a cloud-hosted web application accessible via any modern browser. It is structured as
                a multi-tenant platform — multiple independent medical agencies share the same infrastructure, each
                with complete data isolation.
              </P>
              <P>A typical consultation workflow is:</P>
              <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "16px 20px", margin: "12px 0", fontSize: 13 }}>
                <strong>Customer registers</strong> (via portal or external API)
                → <strong>Admin books appointment</strong> (links customer, surgeon, event)
                → <strong>System sends confirmation email</strong>
                → <strong>Customer completes questionnaire</strong> (pre-consultation portal)
                → <strong>Customer signs medical declaration</strong>
                → <strong>Surgeon conducts consultation</strong> (real-time consultation room)
                → <strong>Admin marks outcome</strong> (completed / no-show / cancelled)
                → <strong>Webhook notifies external systems</strong>
              </div>
            </Sec>

            {/* 4 — Agency */}
            <Sec title="4. Functional Requirements — Agency Management">
              <ReqTable reqs={[
                ["REQ-AG-01", "Must", "The system shall support multiple independent agencies, each with complete data isolation."],
                ["REQ-AG-02", "Must", "Each agency shall have configurable branding: name, logo, primary colour, secondary colour, and contact email."],
                ["REQ-AG-03", "Must", "Each agency shall support a configurable currency (GBP, EUR, USD, etc.)."],
                ["REQ-AG-04", "Must", "An App Owner shall be able to create, edit, and delete agencies."],
                ["REQ-AG-05", "Must", "Each agency shall have a unique API key for external system authentication."],
                ["REQ-AG-06", "Must", "API keys shall be generated securely (cryptographically random, minimum 32 bytes), revocable, and regeneratable at any time."],
                ["REQ-AG-07", "Should", "Each agency shall optionally have a webhook URL and signing secret for outbound event notifications."],
                ["REQ-AG-08", "Should", "Admins shall be able to test email delivery per agency from the admin interface."],
                ["REQ-AG-09", "Could", "The system shall display a live count of emails sent per agency."],
              ]} />
            </Sec>

            {/* 5 — Surgeon */}
            <Sec title="5. Functional Requirements — Surgeon Management">
              <ReqTable reqs={[
                ["REQ-SU-01", "Must", "Admins shall be able to create, edit, and deactivate surgeon profiles within their agency."],
                ["REQ-SU-02", "Must", "Surgeon profiles shall include: full name, speciality, contact details, photo, and bio."],
                ["REQ-SU-03", "Must", "Each surgeon shall have a dedicated Clerk login linked to their profile."],
                ["REQ-SU-04", "Must", "Surgeons shall have a read-only view of their own upcoming and past appointments."],
                ["REQ-SU-05", "Must", "Surgeons shall access a consultation room view showing full patient context for the current appointment."],
                ["REQ-SU-06", "Should", "Surgeons shall be able to record consultation notes within the consultation room."],
              ]} />
            </Sec>

            {/* 6 — Event */}
            <Sec title="6. Functional Requirements — Event Management">
              <ReqTable reqs={[
                ["REQ-EV-01", "Must", "Admins shall be able to create events that define a time period and location where consultations are offered."],
                ["REQ-EV-02", "Must", "Events shall have: title, description, date range, location, assigned surgeons, and status (draft / published / closed)."],
                ["REQ-EV-03", "Must", "Published events shall be accessible to the public at a unique URL for self-service booking."],
                ["REQ-EV-04", "Must", "Admins shall be able to close or archive events."],
                ["REQ-EV-05", "Should", "Event detail pages shall display available appointment slots."],
                ["REQ-EV-06", "Could", "Events shall support an optional capacity limit."],
              ]} />
            </Sec>

            {/* 7 — Customer */}
            <Sec title="7. Functional Requirements — Customer Management">
              <ReqTable reqs={[
                ["REQ-CU-01", "Must", "Admins shall be able to create, view, edit, and search customer records."],
                ["REQ-CU-02", "Must", "Customer records shall include: first name, last name, email, phone, dialling code, nationality, address, postcode, preferred language, height, weight, and medical services interest."],
                ["REQ-CU-03", "Must", "Customers shall be deduplicated by email address per agency."],
                ["REQ-CU-04", "Must", "External systems shall be able to register customers via the public REST API using an API key."],
                ["REQ-CU-05", "Must", "A welcome email shall be sent automatically when a customer is created and has an email address."],
                ["REQ-CU-06", "Should", "Customer detail pages shall show all linked appointments and questionnaire responses."],
                ["REQ-CU-07", "Should", "Admins shall be able to filter and search customers by name, email, nationality, and interest area."],
              ]} />
            </Sec>

            {/* 8 — Appointments */}
            <Sec title="8. Functional Requirements — Appointments & Consultations">
              <ReqTable reqs={[
                ["REQ-AP-01", "Must", "Admins shall be able to book appointments linking a customer, surgeon, and event."],
                ["REQ-AP-02", "Must", "Appointment status shall follow a defined lifecycle: scheduled → confirmed → completed | cancelled | no-show."],
                ["REQ-AP-03", "Must", "Admins shall be able to reschedule appointments to a new date/time."],
                ["REQ-AP-04", "Must", "Admins shall be able to cancel appointments with an optional reason."],
                ["REQ-AP-05", "Must", "The system shall send email notifications on: booking confirmation, reschedule, and cancellation."],
                ["REQ-AP-06", "Must", "Appointment fees shall be recordable in the agency's configured currency."],
                ["REQ-AP-07", "Must", "Status changes shall trigger outbound webhook events where configured."],
                ["REQ-AP-08", "Should", "Admins shall be able to record no-show outcomes with a reason."],
                ["REQ-AP-09", "Should", "The consultation room shall display patient questionnaire responses and medical declaration status."],
                ["REQ-AP-10", "Could", "Colour-coded appointment status badges shall be displayed throughout the interface."],
              ]} />
            </Sec>

            {/* 9 — Questionnaires */}
            <Sec title="9. Functional Requirements — Questionnaires">
              <ReqTable reqs={[
                ["REQ-QU-01", "Must", "Admins shall be able to create questionnaire templates with customisable questions."],
                ["REQ-QU-02", "Must", "Question types shall include: short text, long text, single choice, multiple choice, and yes/no."],
                ["REQ-QU-03", "Must", "Questionnaires shall be assignable to appointments."],
                ["REQ-QU-04", "Must", "Customers shall complete questionnaires via a secure, unauthenticated portal link."],
                ["REQ-QU-05", "Must", "Completed questionnaire responses shall be viewable by admins and surgeons."],
                ["REQ-QU-06", "Must", "Customers shall be able to sign a medical declaration confirming the accuracy of their responses."],
                ["REQ-QU-07", "Should", "The system shall send a reminder email when a questionnaire has not been completed N days before the appointment."],
              ]} />
            </Sec>

            {/* 10 — Email */}
            <Sec title="10. Functional Requirements — Notifications & Email">
              <ReqTable reqs={[
                ["REQ-EM-01", "Must", "All outgoing emails shall use per-agency branding: logo, primary colour, and agency name."],
                ["REQ-EM-02", "Must", "Email triggers: customer welcome, appointment confirmation, reschedule notification, cancellation notification, questionnaire reminder."],
                ["REQ-EM-03", "Must", "A full log of all sent emails shall be accessible to admins, filterable by status and date."],
                ["REQ-EM-04", "Must", "Emails shall be delivered via the Resend API."],
                ["REQ-EM-05", "Should", "Admins shall be able to send a test email to verify delivery configuration."],
                ["REQ-EM-06", "Should", "The system shall support automated reminder scheduling configurable per agency."],
                ["REQ-EM-07", "Could", "Emails shall be localised to the customer's preferred language where translations are available."],
              ]} />
            </Sec>

            {/* 11 — External API */}
            <Sec title="11. Functional Requirements — External API & Webhooks">
              <ReqTable reqs={[
                ["REQ-EX-01", "Must", "The system shall expose a public REST endpoint (POST /api/public/customers) for external customer registration."],
                ["REQ-EX-02", "Must", "External API access shall be authenticated using a per-agency API key passed in the X-API-Key request header."],
                ["REQ-EX-03", "Must", "Duplicate customer registrations (same email, same agency) shall return a 409 response with the existing customer ID."],
                ["REQ-EX-04", "Must", "Each agency shall optionally configure a webhook URL to receive real-time event notifications."],
                ["REQ-EX-05", "Must", "Webhooks shall be signed using HMAC-SHA256 and the signature delivered in the X-Webhook-Signature header."],
                ["REQ-EX-06", "Must", "Webhook events shall include: customer.registered, appointment.created, appointment.status_changed, appointment.rescheduled."],
                ["REQ-EX-07", "Must", "Webhook delivery shall not block the primary API response (fire-and-forget with a 10-second timeout)."],
                ["REQ-EX-08", "Should", "API keys and webhook secrets shall be regeneratable independently at any time from the admin interface."],
              ]} />
            </Sec>

            {/* 12 — Reports */}
            <Sec title="12. Functional Requirements — Reports & Analytics">
              <ReqTable reqs={[
                ["REQ-RE-01", "Must", "A reports dashboard shall show: total appointments by status, revenue, and new customers for a selected period."],
                ["REQ-RE-02", "Should", "Reports shall be filterable by date range and event."],
                ["REQ-RE-03", "Should", "Revenue figures shall be displayed in the agency's configured currency."],
                ["REQ-RE-04", "Could", "Data shall be exportable to CSV."],
              ]} />
            </Sec>

            {/* 13 — NFR */}
            <Sec title="13. Non-Functional Requirements">
              <ReqTable reqs={[
                ["REQ-NF-01", "Must", "The application shall be accessible via any modern web browser (Chrome, Firefox, Safari, Edge) without plugin installation."],
                ["REQ-NF-02", "Must", "The interface shall be responsive and usable on desktop screens (1280px+) and tablets (768px+)."],
                ["REQ-NF-03", "Must", "All user data shall be stored in a cloud-hosted PostgreSQL database with automatic backups."],
                ["REQ-NF-04", "Must", "Authentication shall be managed by Clerk with support for multi-factor authentication."],
                ["REQ-NF-05", "Must", "All inter-service communication shall be encrypted via TLS/HTTPS."],
                ["REQ-NF-06", "Must", "Each agency's data shall be fully isolated; no cross-agency data leakage shall be possible."],
                ["REQ-NF-07", "Must", "The public customer registration API shall support a minimum throughput of 100 requests per minute."],
                ["REQ-NF-08", "Should", "The admin interface shall load within 2 seconds on a standard broadband connection."],
                ["REQ-NF-09", "Should", "The system shall support internationalisation with English, Spanish, Portuguese (BR), and Turkish languages."],
                ["REQ-NF-10", "Could", "The application shall achieve a Lighthouse accessibility score of ≥ 90."],
              ]} />
            </Sec>

            {/* 14 — Constraints */}
            <Sec title="14. Constraints & Assumptions">
              <H3>14.1 Constraints</H3>
              <ul style={ul}>
                <li>The platform is hosted on Replit and deployed as a single Replit App at a <code style={inlineCode}>.replit.app</code> domain.</li>
                <li>Email delivery is dependent on the Resend service and subject to Resend's sending limits.</li>
                <li>Authentication is entirely managed by Clerk; the system does not maintain its own password store.</li>
                <li>File uploads are stored in Google Cloud Object Storage; local filesystem storage is not used.</li>
              </ul>
              <H3>14.2 Assumptions</H3>
              <ul style={ul}>
                <li>Agencies are onboarded manually by an App Owner; self-service agency signup is not required.</li>
                <li>All appointments are conducted in person or via an external video link; the platform does not host video.</li>
                <li>Customer portal links are distributed by admins or via automated email; no customer login account is required.</li>
                <li>The external booking website (Beespoke-Med-Istanbul) is responsible for verifying webhook signatures on its side.</li>
              </ul>
            </Sec>

            {/* 15 — Glossary */}
            <Sec title="15. Glossary">
              <Table
                head={["Term", "Definition"]}
                rows={[
                  ["Agency", "A medical organisation using MedConsult (e.g. Premier Medical Group, Beespoke-Med-Istanbul)."],
                  ["App Owner", "The platform-level administrator who manages all agencies."],
                  ["Appointment", "A booked consultation slot linking a customer, surgeon, and event."],
                  ["Consultation Room", "The in-app view a surgeon uses during an active consultation."],
                  ["Customer", "A patient or prospective patient registered in the system."],
                  ["Declaration", "A signed statement from the customer confirming the accuracy of their questionnaire responses."],
                  ["Event", "A scheduled period during which consultations are offered at a specific location."],
                  ["Questionnaire", "A set of pre-consultation questions completed by the customer via the portal."],
                  ["Webhook", "An HTTP POST sent by MedConsult to a configured URL when a key event occurs."],
                  ["HMAC-SHA256", "A cryptographic method used to sign and verify webhook payloads."],
                ]}
              />
            </Sec>

          </div>

          <Footer doc="User Requirement Specification" version="1.0" />
        </div>
      </div>
    </>
  );
}

/* ── Shared helpers ── */
const ul: React.CSSProperties = { fontSize: 13, color: "#374151", paddingLeft: 20, margin: "8px 0 12px", lineHeight: 2 };
const inlineCode: React.CSSProperties = { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4, padding: "1px 5px", fontFamily: "Courier New, monospace", fontSize: 12 };

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 1.65 }}>{children}</p>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", margin: "20px 0 8px" }}>{children}</h3>;
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="req-block" style={{ marginBottom: 8 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#145c4b", margin: "36px 0 14px", paddingBottom: 8, borderBottom: "2px solid #d1fae5" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
function Toc({ items }: { items: string[] }) {
  return (
    <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#145c4b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Contents</p>
      <ol style={{ fontSize: 13, color: "#145c4b", paddingLeft: 18, margin: 0, lineHeight: 2 }}>
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
function ReqTable({ reqs }: { reqs: [string, string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, margin: "12px 0" }}>
      <thead>
        <tr>
          {["ID", "Priority", "Requirement"].map(h => (
            <th key={h} style={{ background: "#f3f4f6", textAlign: "left", padding: "8px 12px", fontWeight: 700, border: "1px solid #e5e7eb", color: "#374151", width: h === "ID" ? 110 : h === "Priority" ? 80 : "auto" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {reqs.map(([id, pri, text], i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#145c4b", whiteSpace: "nowrap" }}>{id}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>
              <span style={{
                display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
                background: pri === "Must" ? "#d1fae5" : pri === "Should" ? "#dbeafe" : "#fef3c7",
                color: pri === "Must" ? "#065f46" : pri === "Should" ? "#1e40af" : "#92400e",
              }}>{pri}</span>
            </td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{text}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", fontFamily: "monospace", fontWeight: 700, color: "#145c4b" }}>{ver}</td>
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
