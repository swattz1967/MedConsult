import { Resend } from "resend";
import { logger } from "./logger";
import { format } from "date-fns";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn("RESEND_API_KEY not set — email notifications disabled");
    return null;
  }
  return new Resend(key);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "MedConsult <notifications@medconsult.app>";

// ─── Shared HTML helpers ──────────────────────────────────────────────────────

function emailWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin:0; padding:0; background:#f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a2e; }
  .wrapper { max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
  .header { background:#145c4b; padding:28px 36px; }
  .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-.3px; }
  .header p  { margin:4px 0 0; color:rgba(255,255,255,.7); font-size:13px; }
  .body { padding:28px 36px; }
  .card { background:#f8fafb; border:1px solid #e8ecf0; border-radius:8px; padding:18px 22px; margin:20px 0; }
  .card-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e8ecf0; font-size:14px; }
  .card-row:last-child { border-bottom:none; }
  .label { color:#6b7280; }
  .value { font-weight:600; color:#111827; text-align:right; }
  .badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; }
  .badge-green { background:#dcfce7; color:#166534; }
  .badge-red   { background:#fee2e2; color:#991b1b; }
  .badge-blue  { background:#dbeafe; color:#1e40af; }
  .btn { display:inline-block; margin-top:20px; padding:12px 28px; background:#145c4b; color:#fff!important; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; }
  .footer { padding:20px 36px; background:#f8fafb; border-top:1px solid #e8ecf0; font-size:12px; color:#9ca3af; }
  h2 { font-size:18px; margin:0 0 6px; }
  p  { font-size:14px; line-height:1.6; color:#374151; margin:0 0 12px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>MedConsult</h1>
    <p>Surgical Consultation Management</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">This is an automated notification from MedConsult. Please do not reply to this email.</div>
</div>
</body>
</html>`;
}

function formatDateTime(iso: string) {
  return format(new Date(iso), "EEEE, MMMM d, yyyy 'at' h:mm a");
}

// ─── Appointment data type ────────────────────────────────────────────────────

interface AppointmentEmailData {
  appointmentId: number;
  startTime: string;
  endTime: string;
  fee?: number | null;
  slotMinutes?: number | null;
  customerName: string;
  customerEmail: string;
  surgeonName: string;
  surgeonEmail: string;
  eventName: string;
  eventVenue?: string | null;
}

// ─── 1. Booking confirmation → customer ──────────────────────────────────────

export async function sendBookingConfirmation(data: AppointmentEmailData): Promise<void> {
  const client = getClient();
  if (!client) return;

  const baseUrl = process.env.APP_URL ?? "";

  const html = emailWrapper(`
    <h2>Your consultation is confirmed!</h2>
    <p>Hi ${data.customerName}, your appointment has been successfully booked. Here are your details:</p>
    <div class="card">
      <div class="card-row"><span class="label">Surgeon</span><span class="value">${data.surgeonName}</span></div>
      <div class="card-row"><span class="label">Event</span><span class="value">${data.eventName}</span></div>
      ${data.eventVenue ? `<div class="card-row"><span class="label">Venue</span><span class="value">${data.eventVenue}</span></div>` : ""}
      <div class="card-row"><span class="label">Date &amp; Time</span><span class="value">${formatDateTime(data.startTime)}</span></div>
      <div class="card-row"><span class="label">Duration</span><span class="value">${data.slotMinutes ?? 30} minutes</span></div>
      ${data.fee ? `<div class="card-row"><span class="label">Consultation Fee</span><span class="value">$${data.fee}</span></div>` : ""}
      <div class="card-row"><span class="label">Status</span><span class="value"><span class="badge badge-green">Confirmed</span></span></div>
    </div>

    <h2 style="margin-top:28px;">Before your appointment</h2>
    <p>Please complete the following steps before your consultation date:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:0 0 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ecf0;border-radius:8px;overflow:hidden;">
            <tr>
              <td width="48" style="background:#fff7ed;padding:14px 16px;vertical-align:top;text-align:center;">
                <span style="font-size:20px;">✍️</span>
              </td>
              <td style="padding:14px 16px;vertical-align:top;">
                <div style="font-weight:600;font-size:14px;color:#111827;">Sign your patient declaration</div>
                <div style="font-size:13px;color:#6b7280;margin-top:3px;">Read and accept 6 consent clauses. Required before your consultation begins.</div>
              </td>
              <td style="padding:14px 16px;vertical-align:middle;text-align:right;white-space:nowrap;">
                <a href="${baseUrl}/portal/declaration" style="display:inline-block;padding:7px 16px;background:#145c4b;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Sign Now</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ecf0;border-radius:8px;overflow:hidden;">
            <tr>
              <td width="48" style="background:#eff6ff;padding:14px 16px;vertical-align:top;text-align:center;">
                <span style="font-size:20px;">📋</span>
              </td>
              <td style="padding:14px 16px;vertical-align:top;">
                <div style="font-weight:600;font-size:14px;color:#111827;">Complete your pre-consultation form</div>
                <div style="font-size:13px;color:#6b7280;margin-top:3px;">Provide your medical history so your surgeon can prepare for the consultation.</div>
              </td>
              <td style="padding:14px 16px;vertical-align:middle;text-align:right;white-space:nowrap;">
                <a href="${baseUrl}/portal" style="display:inline-block;padding:7px 16px;background:#1e40af;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Fill in Form</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:#6b7280;">You can manage everything from your patient portal at any time.</p>
    <a href="${baseUrl}/portal" class="btn">Open My Portal</a>
  `);

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: `Consultation confirmed — ${data.surgeonName} on ${format(new Date(data.startTime), "MMM d, yyyy")}`,
      html,
    });
    logger.info({ appointmentId: data.appointmentId, to: data.customerEmail }, "Booking confirmation sent to customer");
  } catch (err) {
    logger.error({ err, appointmentId: data.appointmentId }, "Failed to send booking confirmation to customer");
  }
}

// ─── 2. New booking alert → surgeon ──────────────────────────────────────────

export async function sendNewBookingAlert(data: AppointmentEmailData): Promise<void> {
  const client = getClient();
  if (!client) return;

  const html = emailWrapper(`
    <h2>New consultation booked</h2>
    <p>Hi ${data.surgeonName}, a new consultation has been scheduled with you.</p>
    <div class="card">
      <div class="card-row"><span class="label">Patient</span><span class="value">${data.customerName}</span></div>
      <div class="card-row"><span class="label">Event</span><span class="value">${data.eventName}</span></div>
      ${data.eventVenue ? `<div class="card-row"><span class="label">Venue</span><span class="value">${data.eventVenue}</span></div>` : ""}
      <div class="card-row"><span class="label">Date &amp; Time</span><span class="value">${formatDateTime(data.startTime)}</span></div>
      <div class="card-row"><span class="label">Duration</span><span class="value">${data.slotMinutes ?? 30} minutes</span></div>
      ${data.fee ? `<div class="card-row"><span class="label">Fee</span><span class="value">$${data.fee}</span></div>` : ""}
    </div>
    <p>You can review the patient's pre-consultation form and manage this appointment from the surgeon portal.</p>
    <a href="${process.env.APP_URL ?? "#"}/surgeon" class="btn">Open Surgeon Portal</a>
  `);

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: data.surgeonEmail,
      subject: `New appointment: ${data.customerName} on ${format(new Date(data.startTime), "MMM d, yyyy")}`,
      html,
    });
    logger.info({ appointmentId: data.appointmentId, to: data.surgeonEmail }, "New booking alert sent to surgeon");
  } catch (err) {
    logger.error({ err, appointmentId: data.appointmentId }, "Failed to send new booking alert to surgeon");
  }
}

// ─── 3. Declaration reminder → customer ──────────────────────────────────────

interface DeclarationReminderData {
  customerId: number;
  customerName: string;
  customerEmail: string;
}

export async function sendDeclarationReminder(data: DeclarationReminderData): Promise<void> {
  const client = getClient();
  if (!client) return;

  const portalUrl = `${process.env.APP_URL ?? ""}/portal/declaration`;

  const html = emailWrapper(`
    <h2>Action required: Please sign your patient declaration</h2>
    <p>Hi ${data.customerName},</p>
    <p>Before your upcoming consultation, we need you to read and sign your patient declaration form. This is a quick process that covers your consent for the consultation service.</p>
    <div class="card">
      <div class="card-row"><span class="label">What you need to do</span><span class="value">Sign patient declaration</span></div>
      <div class="card-row"><span class="label">Time required</span><span class="value">~2 minutes</span></div>
      <div class="card-row"><span class="label">Status</span><span class="value"><span class="badge badge-red">Unsigned</span></span></div>
    </div>
    <p>Click the button below to sign your declaration. You will be asked to review 6 short consent clauses and add your digital signature.</p>
    <a href="${portalUrl}" class="btn">Sign My Declaration</a>
    <p style="margin-top:20px;font-size:12px;color:#9ca3af;">If you have already signed, you can ignore this email.</p>
  `);

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: "Action required: Sign your patient declaration before your consultation",
      html,
    });
    logger.info({ customerId: data.customerId, to: data.customerEmail }, "Declaration reminder sent");
  } catch (err) {
    logger.error({ err, customerId: data.customerId }, "Failed to send declaration reminder");
    throw err;
  }
}

// ─── 4. Reschedule notification → customer + surgeon ─────────────────────────

interface RescheduleEmailData extends AppointmentEmailData {
  oldStartTime: string;
}

export async function sendRescheduleNotification(
  data: RescheduleEmailData,
  recipientType: "customer" | "surgeon",
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const baseUrl = process.env.APP_URL ?? "";
  const isCustomer = recipientType === "customer";
  const toEmail = isCustomer ? data.customerEmail : data.surgeonEmail;
  const toName = isCustomer ? data.customerName : data.surgeonName;
  const portalHref = isCustomer ? `${baseUrl}/portal` : `${baseUrl}/surgeon`;
  const portalLabel = isCustomer ? "Open My Portal" : "Open Surgeon Portal";

  const html = emailWrapper(`
    <h2>Your consultation has been rescheduled</h2>
    <p>Hi ${toName}, your upcoming consultation has been moved to a new date and time.</p>
    <div class="card">
      <div class="card-row">
        <span class="label">Previous Date &amp; Time</span>
        <span class="value" style="text-decoration:line-through;color:#9ca3af;">${formatDateTime(data.oldStartTime)}</span>
      </div>
      <div class="card-row">
        <span class="label">New Date &amp; Time</span>
        <span class="value" style="color:#145c4b;font-weight:700;">${formatDateTime(data.startTime)}</span>
      </div>
      <div class="card-row"><span class="label">${isCustomer ? "Surgeon" : "Patient"}</span><span class="value">${isCustomer ? data.surgeonName : data.customerName}</span></div>
      <div class="card-row"><span class="label">Event</span><span class="value">${data.eventName}</span></div>
      ${data.eventVenue ? `<div class="card-row"><span class="label">Venue</span><span class="value">${data.eventVenue}</span></div>` : ""}
      <div class="card-row"><span class="label">Duration</span><span class="value">${data.slotMinutes ?? 30} minutes</span></div>
      <div class="card-row"><span class="label">Status</span><span class="value"><span class="badge badge-blue">Rescheduled</span></span></div>
    </div>
    ${isCustomer ? `<p>Please make sure your calendar is updated. Your declaration and pre-consultation form remain valid.</p>` : `<p>Please update your schedule accordingly.</p>`}
    <a href="${portalHref}" class="btn">${portalLabel}</a>
  `);

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: `Consultation rescheduled — ${data.eventName} now on ${format(new Date(data.startTime), "MMM d, yyyy")}`,
      html,
    });
    logger.info(
      { appointmentId: data.appointmentId, to: toEmail, newTime: data.startTime },
      "Reschedule notification sent",
    );
  } catch (err) {
    logger.error({ err, appointmentId: data.appointmentId }, "Failed to send reschedule notification");
  }
}

// ─── 5. Status update notification → customer ────────────────────────────────

const STATUS_COPY: Record<string, { subject: string; headline: string; body: string; badgeClass: string }> = {
  cancelled: {
    subject: "Consultation cancelled",
    headline: "Your consultation has been cancelled",
    body: "We're sorry to inform you that your upcoming consultation has been cancelled. Please contact us or re-book through the portal.",
    badgeClass: "badge-red",
  },
  completed: {
    subject: "Consultation completed",
    headline: "Consultation completed",
    body: "Your consultation has been marked as completed. Thank you for using MedConsult.",
    badgeClass: "badge-blue",
  },
  no_show: {
    subject: "Missed consultation",
    headline: "You missed your consultation",
    body: "We noticed you did not attend your scheduled consultation. Please contact us to reschedule.",
    badgeClass: "badge-red",
  },
  scheduled: {
    subject: "Consultation rescheduled",
    headline: "Your consultation has been updated",
    body: "Your consultation details have been updated. Please review the new details below.",
    badgeClass: "badge-green",
  },
};

export async function sendStatusChangeNotification(
  data: AppointmentEmailData,
  newStatus: string,
  recipientType: "customer" | "surgeon",
  notes?: string | null,
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const copy = STATUS_COPY[newStatus];
  if (!copy) return;

  const baseUrl = process.env.APP_URL ?? "";
  const toEmail = recipientType === "customer" ? data.customerEmail : data.surgeonEmail;
  const toName = recipientType === "customer" ? data.customerName : data.surgeonName;
  const otherPartyLabel = recipientType === "customer" ? "Surgeon" : "Patient";
  const otherPartyName = recipientType === "customer" ? data.surgeonName : data.customerName;
  const portalHref = recipientType === "customer" ? `${baseUrl}/portal` : `${baseUrl}/surgeon`;
  const portalLabel = recipientType === "customer" ? "Open My Portal" : "Open Surgeon Portal";

  const reasonRow =
    newStatus === "cancelled" && notes
      ? `<div class="card-row"><span class="label">Reason</span><span class="value">${notes}</span></div>`
      : "";

  const rebookNote =
    newStatus === "cancelled" && recipientType === "customer"
      ? `<p>If you wish to rebook, please visit your patient portal or contact us directly.</p>`
      : "";

  const html = emailWrapper(`
    <h2>${copy.headline}</h2>
    <p>Hi ${toName}, ${copy.body}</p>
    <div class="card">
      <div class="card-row"><span class="label">${otherPartyLabel}</span><span class="value">${otherPartyName}</span></div>
      <div class="card-row"><span class="label">Event</span><span class="value">${data.eventName}</span></div>
      ${data.eventVenue ? `<div class="card-row"><span class="label">Venue</span><span class="value">${data.eventVenue}</span></div>` : ""}
      <div class="card-row"><span class="label">Date &amp; Time</span><span class="value">${formatDateTime(data.startTime)}</span></div>
      ${data.slotMinutes ? `<div class="card-row"><span class="label">Duration</span><span class="value">${data.slotMinutes} minutes</span></div>` : ""}
      ${reasonRow}
      <div class="card-row"><span class="label">Status</span><span class="value"><span class="badge ${copy.badgeClass}">${newStatus.replace("_", " ")}</span></span></div>
    </div>
    ${rebookNote}
    <a href="${portalHref}" class="btn">${portalLabel}</a>
  `);

  try {
    await client.emails.send({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: `${copy.subject} — ${data.eventName}`,
      html,
    });
    logger.info({ appointmentId: data.appointmentId, to: toEmail, status: newStatus }, "Status change notification sent");
  } catch (err) {
    logger.error({ err, appointmentId: data.appointmentId }, "Failed to send status change notification");
  }
}
