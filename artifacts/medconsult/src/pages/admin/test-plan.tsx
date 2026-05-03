import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function TestPlan() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; padding: 0 16px !important; }
          h2 { page-break-after: avoid; }
          table { page-break-inside: avoid; }
          .test-block { page-break-inside: avoid; }
        }
      `}</style>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Plan</h1>
            <p className="text-sm text-gray-500 mt-1">MedConsult · Version 1.0 · May 2026</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-[#145c4b] hover:bg-[#0f4538]">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        <div className="print-page bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <div style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)", padding: "32px 40px" }}>
            <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              Test Plan
            </div>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0 }}>MedConsult</h1>
            <p style={{ color: "#ddd6fe", fontSize: 14, marginTop: 6 }}>Acceptance Test Plan — Functional & Non-Functional Criteria</p>
            <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[["Version", "1.0"], ["Date", "3 May 2026"], ["Status", "Active"], ["Author", "amswatton@hotmail.com"]].map(([k, v]) => (
                <span key={k} style={{ background: "rgba(255,255,255,0.15)", color: "#ede9fe", fontSize: 12, padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)" }}>
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>

          <div style={{ padding: "32px 40px", fontFamily: "system-ui, sans-serif" }}>

            <Toc items={[
              "Version History",
              "Introduction & Purpose",
              "Test Scope",
              "Test Approach & Pass Criteria",
              "Test Cases — Agency Management",
              "Test Cases — Surgeon Management",
              "Test Cases — Event Management",
              "Test Cases — Customer Management",
              "Test Cases — Appointments & Consultations",
              "Test Cases — Questionnaires",
              "Test Cases — Email Notifications",
              "Test Cases — External API & Webhooks",
              "Test Cases — Reports & Analytics",
              "Non-Functional Test Criteria",
              "Test Sign-off",
            ]} />

            {/* Version History */}
            <Sec title="Version History">
              <VersionTable rows={[
                ["1.0", "3 May 2026", "amswatton@hotmail.com", "Initial test plan. All acceptance criteria aligned to URS v1.0 requirements."],
              ]} />
              <Note colour="amber">
                <strong>How to update:</strong> When features change, add a new row above with the incremented version, today's date, your name, and a brief summary. Always ensure test case IDs remain in sync with the corresponding REQ-XX-XX identifiers in the User Requirement Specification.
              </Note>
            </Sec>

            {/* 1 */}
            <Sec title="1. Introduction & Purpose">
              <P>
                This Test Plan defines the acceptance criteria and test cases for <strong>MedConsult</strong>. It is
                structured to map directly to the User Requirement Specification (URS v1.0) — each test case
                references the requirement(s) it verifies.
              </P>
              <P>
                The purpose is to provide a structured, printable checklist that can be used by the development
                team or a tester to systematically verify that every feature works correctly before the system
                is signed off for production use.
              </P>
              <Note colour="blue">
                <strong>How to use this document:</strong> Work through each section in order. For each test case,
                perform the described steps, observe the actual result, and mark the outcome as
                <PassBadge /> (pass), <FailBadge /> (fail), or <NBadge /> (not tested / skipped).
                Record any failures in the Notes column for follow-up.
              </Note>
            </Sec>

            {/* 2 */}
            <Sec title="2. Test Scope">
              <H3>In scope</H3>
              <ul style={ul}>
                <li>All functional requirements from URS v1.0 with priority Must or Should</li>
                <li>Critical non-functional requirements (security, multi-tenancy isolation, email delivery)</li>
                <li>External API customer registration endpoint</li>
                <li>Outbound webhook delivery and signature verification</li>
                <li>Admin portal UI workflows</li>
                <li>Customer self-service portal</li>
                <li>Surgeon portal</li>
              </ul>
              <H3>Out of scope</H3>
              <ul style={ul}>
                <li>Load and performance testing (beyond manual response-time checks)</li>
                <li>Penetration testing (covered separately if required)</li>
                <li>Browser compatibility beyond Chrome/Edge/Firefox/Safari latest</li>
                <li>URS Could-priority requirements (tested at discretion)</li>
              </ul>
            </Sec>

            {/* 3 */}
            <Sec title="3. Test Approach & Pass Criteria">
              <Table
                head={["Aspect", "Approach"]}
                rows={[
                  ["Test type", "Manual acceptance testing — testers follow step-by-step instructions and verify outcomes against expected results"],
                  ["Environment", "Production app at https://medical-visit-manager--amswatton.replit.app or staging equivalent"],
                  ["Test data", "Use the Beespoke-Med-Istanbul agency (id=2) for API/webhook tests; Premier Medical Group (id=1) for admin workflow tests"],
                  ["Pass criteria", "Actual result matches expected result exactly; no unhandled errors or broken UI"],
                  ["Fail criteria", "Actual result differs from expected, error is thrown, or UI is broken/missing"],
                  ["Retest", "Failed tests are retested after the fix is deployed; the original failure is noted in the Notes column"],
                  ["Sign-off", "All Must-priority test cases must pass before production sign-off; Should-priority failures require documented risk acceptance"],
                ]}
              />
              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><PassBadge /> = Pass (actual matches expected)</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><FailBadge /> = Fail (record actual result in Notes)</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><NBadge /> = Not Tested / N/A</span>
              </div>
            </Sec>

            {/* 4 — Agency */}
            <Sec title="4. Test Cases — Agency Management">
              <TestTable cases={[
                { id: "TC-AG-01", req: "REQ-AG-01", pri: "Must", desc: "Data isolation between agencies", steps: "Log in as admin of Agency A. Navigate to Customers. Confirm only Agency A customers are visible. Repeat for Agency B admin.", expected: "Each admin sees only their own agency's data. No cross-agency records visible." },
                { id: "TC-AG-02", req: "REQ-AG-02", pri: "Must", desc: "Agency branding — logo & colours", steps: "Edit an agency. Upload a logo, set primary colour. Save. Open the agency's booking page and an outgoing email.", expected: "Logo and primary colour appear correctly on the booking page header and in email templates." },
                { id: "TC-AG-03", req: "REQ-AG-03", pri: "Must", desc: "Agency currency", steps: "Set agency currency to EUR. Create an appointment with a fee. View the appointment.", expected: "Fee is displayed with € symbol throughout the UI." },
                { id: "TC-AG-04", req: "REQ-AG-04", pri: "Must", desc: "Create, edit, delete agency", steps: "As App Owner: create a new agency, edit its name, then delete it.", expected: "Agency appears after creation, name updates after edit, agency is removed after deletion with no orphaned records." },
                { id: "TC-AG-05", req: "REQ-AG-05/06", pri: "Must", desc: "Generate & rotate API key", steps: "Edit agency → External API Integration → Generate Key. Copy key. Make a successful API call. Regenerate key. Attempt API call with old key.", expected: "First call returns 201. After regeneration, old key returns 401." },
                { id: "TC-AG-06", req: "REQ-AG-08", pri: "Should", desc: "Test email delivery", steps: "Click 'Test Email' button on the agencies list for an agency with a valid email address.", expected: "Test email arrives at the agency email address with correct branding within 60 seconds." },
              ]} />
            </Sec>

            {/* 5 — Surgeon */}
            <Sec title="5. Test Cases — Surgeon Management">
              <TestTable cases={[
                { id: "TC-SU-01", req: "REQ-SU-01", pri: "Must", desc: "Create and edit surgeon", steps: "Create a new surgeon with all fields. Save. Edit the speciality. Save.", expected: "Surgeon appears in the list. Speciality updates correctly." },
                { id: "TC-SU-02", req: "REQ-SU-02", pri: "Must", desc: "Surgeon profile completeness", steps: "Create a surgeon and fill in name, speciality, email, phone, and upload a photo.", expected: "All fields save and display correctly. Photo is shown in the surgeon profile." },
                { id: "TC-SU-03", req: "REQ-SU-04", pri: "Must", desc: "Surgeon portal — own appointments only", steps: "Log in as a surgeon. Navigate to Appointments.", expected: "Only appointments assigned to this surgeon are shown. No other surgeon's appointments are visible." },
                { id: "TC-SU-04", req: "REQ-SU-05", pri: "Must", desc: "Consultation room access", steps: "As surgeon, open an active appointment's consultation room.", expected: "Patient's name, medical history, questionnaire responses, and declaration status are visible." },
              ]} />
            </Sec>

            {/* 6 — Events */}
            <Sec title="6. Test Cases — Event Management">
              <TestTable cases={[
                { id: "TC-EV-01", req: "REQ-EV-01/02", pri: "Must", desc: "Create event with all fields", steps: "Create a new event with title, description, date range, location, and assign a surgeon.", expected: "Event appears in the list with all details correct." },
                { id: "TC-EV-02", req: "REQ-EV-03", pri: "Must", desc: "Published event is publicly accessible", steps: "Set event status to Published. Copy the public URL. Open it in a private/incognito browser (not logged in).", expected: "Event detail page loads without requiring login. Booking option is visible." },
                { id: "TC-EV-03", req: "REQ-EV-04", pri: "Must", desc: "Close event", steps: "Set a Published event to Closed.", expected: "Event no longer accepts bookings. Public URL shows closed status or redirects appropriately." },
              ]} />
            </Sec>

            {/* 7 — Customers */}
            <Sec title="7. Test Cases — Customer Management">
              <TestTable cases={[
                { id: "TC-CU-01", req: "REQ-CU-01/02", pri: "Must", desc: "Create customer with all fields", steps: "Create a new customer filling in all available fields including height, weight, and medical services interest.", expected: "Customer record saves with all fields. Customer appears in the list." },
                { id: "TC-CU-02", req: "REQ-CU-03", pri: "Must", desc: "Email deduplication", steps: "Create a customer with email test@example.com. Attempt to create a second customer with the same email.", expected: "System prevents duplicate creation and shows an appropriate error message." },
                { id: "TC-CU-03", req: "REQ-CU-05", pri: "Must", desc: "Welcome email on creation", steps: "Create a customer with a valid email address.", expected: "Welcome email is received at the customer's email address with correct agency branding within 60 seconds." },
                { id: "TC-CU-04", req: "REQ-CU-07", pri: "Should", desc: "Search and filter customers", steps: "In the Customers list, type a partial name into the search box. Clear and search by nationality.", expected: "List filters in real time to show only matching records." },
              ]} />
            </Sec>

            {/* 8 — Appointments */}
            <Sec title="8. Test Cases — Appointments & Consultations">
              <TestTable cases={[
                { id: "TC-AP-01", req: "REQ-AP-01", pri: "Must", desc: "Book appointment", steps: "From the Appointments page, click Book. Select a customer, surgeon, event, and time slot. Confirm.", expected: "Appointment appears in the list with status 'Scheduled'." },
                { id: "TC-AP-02", req: "REQ-AP-02", pri: "Must", desc: "Status lifecycle — confirm", steps: "Set an appointment status to Confirmed.", expected: "Status badge updates to 'Confirmed'. Confirmation email is sent to the customer." },
                { id: "TC-AP-03", req: "REQ-AP-02", pri: "Must", desc: "Status lifecycle — cancel", steps: "Cancel an appointment with a cancellation reason.", expected: "Status updates to 'Cancelled'. Cancellation email is sent. Cancellation reason is stored and visible." },
                { id: "TC-AP-04", req: "REQ-AP-02", pri: "Must", desc: "Status lifecycle — complete", steps: "Mark an appointment as Completed.", expected: "Status updates to 'Completed'. Appointment is no longer editable." },
                { id: "TC-AP-05", req: "REQ-AP-03", pri: "Must", desc: "Reschedule appointment", steps: "Reschedule an appointment to a new date and time.", expected: "New date/time is saved. Reschedule notification email is sent to the customer." },
                { id: "TC-AP-06", req: "REQ-AP-06", pri: "Must", desc: "Fee in agency currency", steps: "Book an appointment and set a fee amount. View the appointment.", expected: "Fee is displayed with the correct currency symbol for this agency." },
                { id: "TC-AP-07", req: "REQ-AP-08", pri: "Should", desc: "Mark no-show", steps: "Record an appointment as No-show with a reason.", expected: "Status updates to 'No-show'. Reason is stored and visible on the appointment detail." },
              ]} />
            </Sec>

            {/* 9 — Questionnaires */}
            <Sec title="9. Test Cases — Questionnaires">
              <TestTable cases={[
                { id: "TC-QU-01", req: "REQ-QU-01/02", pri: "Must", desc: "Create questionnaire with mixed question types", steps: "Create a new questionnaire with at least one of each type: short text, long text, single choice, multiple choice, yes/no.", expected: "Questionnaire is saved. All question types are displayed correctly in preview." },
                { id: "TC-QU-02", req: "REQ-QU-03", pri: "Must", desc: "Assign questionnaire to appointment", steps: "Assign a questionnaire to an existing appointment.", expected: "The portal link for that appointment includes the questionnaire. Questionnaire status shows 'Pending'." },
                { id: "TC-QU-03", req: "REQ-QU-04", pri: "Must", desc: "Customer completes questionnaire via portal", steps: "Open the customer portal link (not logged in). Complete and submit the questionnaire.", expected: "Responses are saved. Questionnaire status updates to 'Completed' in the admin view." },
                { id: "TC-QU-04", req: "REQ-QU-06", pri: "Must", desc: "Customer signs medical declaration", steps: "After completing the questionnaire in the portal, proceed to the declaration step. Draw a signature and submit.", expected: "Declaration is marked as signed with a timestamp. Signature data is stored. Admin can see the signed status." },
                { id: "TC-QU-05", req: "REQ-QU-05", pri: "Must", desc: "Admin views completed responses", steps: "As admin, open the appointment detail for a completed questionnaire.", expected: "All customer responses are shown with the original questions." },
              ]} />
            </Sec>

            {/* 10 — Email */}
            <Sec title="10. Test Cases — Email Notifications">
              <TestTable cases={[
                { id: "TC-EM-01", req: "REQ-EM-01", pri: "Must", desc: "Agency branding in emails", steps: "Configure an agency with a logo and primary colour. Trigger any email (e.g. welcome). Open the received email.", expected: "Email shows the agency logo (not broken image), agency name, and the primary colour in the header." },
                { id: "TC-EM-02", req: "REQ-EM-02", pri: "Must", desc: "All email trigger types fire", steps: "Trigger each email type: customer welcome, appointment confirmation, reschedule, cancellation.", expected: "Each email is received at the correct address within 60 seconds. Subject line matches the event type." },
                { id: "TC-EM-03", req: "REQ-EM-03", pri: "Must", desc: "Email log records all sends", steps: "Send several emails. Navigate to Email Log.", expected: "All sent emails appear in the log with status 'Sent', recipient address, subject, and timestamp." },
                { id: "TC-EM-04", req: "REQ-EM-06", pri: "Should", desc: "Automated reminder is sent", steps: "Configure a reminder rule (e.g. 3 days before appointment). Create an appointment 3 days from now with an incomplete questionnaire. Wait for the scheduler to run (up to 1 hour) or trigger manually.", expected: "Reminder email is sent to the customer. Entry appears in the email log." },
              ]} />
            </Sec>

            {/* 11 — External API */}
            <Sec title="11. Test Cases — External API & Webhooks">
              <TestTable cases={[
                { id: "TC-EX-01", req: "REQ-EX-01", pri: "Must", desc: "Register customer via API — success", steps: "POST to /api/public/customers with a valid API key and a new customer payload (firstName, lastName, email).", expected: "Response is 201 with the new customer object including an id. Customer appears in the admin Customers list." },
                { id: "TC-EX-02", req: "REQ-EX-01", pri: "Must", desc: "Register customer — missing required fields", steps: "POST to /api/public/customers with a valid API key but omit firstName.", expected: "Response is 400 with a validation error message identifying the missing field." },
                { id: "TC-EX-03", req: "REQ-EX-02", pri: "Must", desc: "Invalid API key is rejected", steps: "POST to /api/public/customers with a missing or incorrect X-API-Key header.", expected: "Response is 401 Unauthorized." },
                { id: "TC-EX-04", req: "REQ-EX-03", pri: "Must", desc: "Duplicate customer returns 409", steps: "POST the same customer email twice (same agency) using the public API.", expected: "Second call returns 409 with a body containing the existing customerId." },
                { id: "TC-EX-05", req: "REQ-EX-04/05", pri: "Must", desc: "Webhook delivery with valid signature", steps: "Configure a webhook URL (use a service such as webhook.site). Create a new appointment. Inspect the received POST at the webhook URL.", expected: "Webhook is received with event: appointment.created. X-Webhook-Signature header is present and verifiable with the configured secret." },
                { id: "TC-EX-06", req: "REQ-EX-06", pri: "Must", desc: "All four webhook event types fire", steps: "Trigger each event: customer registration via API, appointment creation, status change, reschedule. Inspect webhook receiver.", expected: "Four separate webhook calls are received, each with the correct event type and relevant data payload." },
                { id: "TC-EX-07", req: "REQ-EX-07", pri: "Must", desc: "Webhook does not block API response", steps: "Configure a slow webhook endpoint (e.g. one that sleeps 5 seconds). Create an appointment via the admin UI. Measure time until 201 response is returned.", expected: "API response is received in under 2 seconds regardless of webhook delivery speed." },
                { id: "TC-EX-08", req: "REQ-EX-08", pri: "Should", desc: "Rotate webhook secret", steps: "Note the current webhook secret. Click 'Generate Secret' to rotate it. Verify a webhook sent after rotation uses the new secret.", expected: "Signature computed with the new secret verifies correctly. Signature computed with the old secret fails." },
              ]} />
            </Sec>

            {/* 12 — Reports */}
            <Sec title="12. Test Cases — Reports & Analytics">
              <TestTable cases={[
                { id: "TC-RE-01", req: "REQ-RE-01", pri: "Must", desc: "Reports dashboard shows key metrics", steps: "Navigate to the Reports page. Verify the presence of appointment count by status, revenue total, and new customer count.", expected: "All three metric types are present and show non-zero values if test data exists." },
                { id: "TC-RE-02", req: "REQ-RE-02", pri: "Should", desc: "Date range filter", steps: "Select a specific date range on the Reports page.", expected: "Metrics update to reflect only appointments/customers within the selected range." },
                { id: "TC-RE-03", req: "REQ-RE-03", pri: "Should", desc: "Revenue in agency currency", steps: "View reports for an agency configured with EUR.", expected: "Revenue figures are displayed with € symbol." },
              ]} />
            </Sec>

            {/* 13 — NFR */}
            <Sec title="13. Non-Functional Test Criteria">
              <TestTable cases={[
                { id: "TC-NF-01", req: "REQ-NF-01", pri: "Must", desc: "Browser compatibility", steps: "Open the admin portal in Chrome, Firefox, Safari, and Edge (latest versions).", expected: "All pages render correctly with no layout breaks, missing styles, or JavaScript errors in any browser." },
                { id: "TC-NF-02", req: "REQ-NF-02", pri: "Must", desc: "Responsive layout — tablet", steps: "Resize browser to 768px wide (or use device emulation). Navigate through key pages: Dashboard, Customers, Appointments.", expected: "All pages are usable at 768px. No content overflows or is hidden unintentionally." },
                { id: "TC-NF-03", req: "REQ-NF-05", pri: "Must", desc: "HTTPS enforcement", steps: "Attempt to access the app via http:// (not https://).", expected: "Request is redirected to https:// automatically." },
                { id: "TC-NF-04", req: "REQ-NF-06", pri: "Must", desc: "Cross-agency data isolation", steps: "Log in as admin of Agency A. Manually modify the browser URL to reference an ID belonging to Agency B (e.g. /admin/customers/99).", expected: "Request returns a 403 or 404. Agency A admin cannot view or modify Agency B data under any circumstances." },
                { id: "TC-NF-05", req: "REQ-NF-08", pri: "Should", desc: "Page load performance", steps: "Clear browser cache. Load the admin Dashboard on a standard broadband connection. Measure time to interactive.", expected: "Page is interactive within 3 seconds on a standard broadband connection." },
                { id: "TC-NF-06", req: "REQ-NF-09", pri: "Should", desc: "Language switching", steps: "Change the language selector (top right of admin portal) to each available language: English, Spanish, Portuguese, Turkish.", expected: "All navigational labels, page titles, and form labels change to the selected language. No untranslated strings visible." },
              ]} />
            </Sec>

            {/* 14 — Sign-off */}
            <Sec title="14. Test Sign-off">
              <P>
                Complete the table below once all test cases have been executed. All Must-priority test cases must
                have a Pass outcome before the system is signed off for production use. Should-priority failures
                require documented risk acceptance.
              </P>
              <Table
                head={["Section", "Must cases", "Should cases", "Pass", "Fail", "Not Tested", "Signed off by", "Date"]}
                rows={[
                  ["Agency Management", "5", "1", "", "", "", "", ""],
                  ["Surgeon Management", "4", "0", "", "", "", "", ""],
                  ["Event Management", "3", "0", "", "", "", "", ""],
                  ["Customer Management", "3", "1", "", "", "", "", ""],
                  ["Appointments & Consultations", "6", "1", "", "", "", "", ""],
                  ["Questionnaires", "5", "0", "", "", "", "", ""],
                  ["Email Notifications", "3", "1", "", "", "", "", ""],
                  ["External API & Webhooks", "7", "1", "", "", "", "", ""],
                  ["Reports & Analytics", "1", "2", "", "", "", "", ""],
                  ["Non-Functional", "4", "2", "", "", "", "", ""],
                  ["TOTAL", "41", "9", "", "", "", "", ""],
                ]}
              />
              <Note colour="green">
                <strong>Overall sign-off:</strong> I confirm that all Must-priority acceptance criteria have been
                tested and passed, and that any Should-priority failures have been reviewed and accepted.<br /><br />
                Signed: _______________________________&nbsp;&nbsp;&nbsp; Date: _______________&nbsp;&nbsp;&nbsp; Role: _______________
              </Note>
            </Sec>

          </div>

          <div style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "16px 40px", fontSize: 11, color: "#9ca3af" }}>
            MedConsult · Test Plan · Version 1.0 · 3 May 2026 · amswatton@hotmail.com
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Shared helpers ── */
const ul: React.CSSProperties = { fontSize: 13, color: "#374151", paddingLeft: 20, margin: "8px 0 12px", lineHeight: 2 };

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 1.65 }}>{children}</p>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", margin: "20px 0 8px" }}>{children}</h3>;
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#5b21b6", margin: "36px 0 14px", paddingBottom: 8, borderBottom: "2px solid #ede9fe" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
function Toc({ items }: { items: string[] }) {
  return (
    <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#5b21b6", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Contents</p>
      <ol style={{ fontSize: 13, color: "#5b21b6", paddingLeft: 18, margin: 0, lineHeight: 2 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ol>
    </div>
  );
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, margin: "12px 0" }}>
      <thead>
        <tr>{head.map(h => <th key={h} style={{ background: "#f3f4f6", textAlign: "left", padding: "7px 10px", fontWeight: 700, border: "1px solid #e5e7eb", color: "#374151" }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
            {row.map((cell, j) => <td key={j} style={{ padding: "7px 10px", border: "1px solid #e5e7eb", verticalAlign: "top" }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Note({ colour, children }: { colour: "green" | "amber" | "blue" }) {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: "#ecfdf5", border: "1px solid #6ee7b7" },
    amber: { background: "#fffbeb", border: "1px solid #fcd34d" },
    blue:  { background: "#eff6ff", border: "1px solid #93c5fd" },
  };
  return (
    <div style={{ ...styles[colour], borderRadius: 8, padding: "12px 16px", margin: "12px 0", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
      {children}
    </div>
  );
}
function PassBadge() {
  return <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: "#d1fae5", color: "#065f46", fontFamily: "monospace" }}>PASS</span>;
}
function FailBadge() {
  return <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#991b1b", fontFamily: "monospace" }}>FAIL</span>;
}
function NBadge() {
  return <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: "#f3f4f6", color: "#6b7280", fontFamily: "monospace" }}>N/T</span>;
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
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", fontFamily: "monospace", fontWeight: 700, color: "#5b21b6" }}>{ver}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{date}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{author}</td>
            <td style={{ padding: "8px 12px", border: "1px solid #e5e7eb" }}>{summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type TestCase = { id: string; req: string; pri: string; desc: string; steps: string; expected: string };
function TestTable({ cases }: { cases: TestCase[] }) {
  return (
    <div className="test-block">
      {cases.map((tc, i) => (
        <table key={i} style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 12, border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f5f3ff" }}>
              <td style={{ padding: "6px 12px", fontWeight: 700, fontFamily: "monospace", color: "#5b21b6", width: 100, border: "1px solid #e5e7eb" }}>{tc.id}</td>
              <td style={{ padding: "6px 12px", fontWeight: 600, color: "#1f2937", border: "1px solid #e5e7eb" }}>{tc.desc}</td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb", width: 80 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>{tc.req}</span>
              </td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb", width: 70 }}>
                <span style={{
                  display: "inline-block", padding: "1px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
                  background: tc.pri === "Must" ? "#d1fae5" : "#dbeafe",
                  color: tc.pri === "Must" ? "#065f46" : "#1e40af",
                }}>{tc.pri}</span>
              </td>
              <td style={{ padding: "6px 12px", border: "1px solid #e5e7eb", width: 90, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Result: ______</span>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#fff" }}>
              <td style={{ padding: "6px 12px", fontWeight: 600, color: "#6b7280", fontSize: 11, border: "1px solid #e5e7eb", verticalAlign: "top", whiteSpace: "nowrap" }}>Steps</td>
              <td colSpan={3} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", color: "#374151", lineHeight: 1.6 }}>{tc.steps}</td>
              <td style={{ border: "1px solid #e5e7eb" }} />
            </tr>
            <tr style={{ background: "#fafafa" }}>
              <td style={{ padding: "6px 12px", fontWeight: 600, color: "#6b7280", fontSize: 11, border: "1px solid #e5e7eb", verticalAlign: "top", whiteSpace: "nowrap" }}>Expected</td>
              <td colSpan={3} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", color: "#374151", lineHeight: 1.6 }}>{tc.expected}</td>
              <td style={{ border: "1px solid #e5e7eb" }} />
            </tr>
            <tr style={{ background: "#fff" }}>
              <td style={{ padding: "6px 12px", fontWeight: 600, color: "#6b7280", fontSize: 11, border: "1px solid #e5e7eb", verticalAlign: "top", whiteSpace: "nowrap" }}>Notes</td>
              <td colSpan={4} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", color: "#9ca3af", fontStyle: "italic", fontSize: 12 }}>Record actual result or failure details here…</td>
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  );
}
