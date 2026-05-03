import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, agenciesTable } from "@workspace/db";
import {
  sendBookingConfirmation,
  sendNewBookingAlert,
  sendRescheduleNotification,
  sendStatusChangeNotification,
  sendDeclarationReminder,
  sendRegistrationWelcome,
} from "../lib/email";

const router: IRouter = Router();

const VALID_TEMPLATES = [
  "registration_welcome",
  "booking_confirmation",
  "new_booking_alert",
  "reschedule_customer",
  "reschedule_surgeon",
  "status_confirmed",
  "status_cancelled",
  "status_completed",
  "status_no_show",
  "declaration_reminder",
] as const;

type TemplateType = (typeof VALID_TEMPLATES)[number];

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/email/preview", async (req, res): Promise<void> => {
  const { templateType, recipientEmail, agencyId } = req.body as Record<string, unknown>;

  if (!VALID_TEMPLATES.includes(templateType as TemplateType)) {
    res.status(400).json({ error: "Invalid templateType" });
    return;
  }
  if (!isValidEmail(recipientEmail)) {
    res.status(400).json({ error: "Invalid recipientEmail" });
    return;
  }
  if (typeof agencyId !== "number" || !Number.isInteger(agencyId) || agencyId < 1) {
    res.status(400).json({ error: "Invalid agencyId" });
    return;
  }

  const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, agencyId));
  if (!agency) {
    res.status(404).json({ error: "Agency not found" });
    return;
  }

  const agencyBranding = {
    name: agency.name,
    color: agency.primaryColor ?? "#145c4b",
    logoUrl: agency.logoUrl,
    email: agency.email,
  };

  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const oldDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const dummyAppointment = {
    appointmentId: 9999,
    customerName: "Alex Johnson",
    customerEmail: recipientEmail,
    surgeonName: "Dr. Sarah Mitchell",
    surgeonEmail: recipientEmail,
    eventName: "London Rhinoplasty Consultation Day",
    eventVenue: "The Harley Street Clinic, 25 Harley Street, London W1G 9PF",
    startTime: futureDate,
    slotMinutes: 30,
    fee: "£250.00",
  };

  try {
    switch (templateType) {
      case "registration_welcome":
        await sendRegistrationWelcome(
          { customerId: 9999, customerName: "Alex Johnson", customerEmail: recipientEmail },
          agencyBranding,
        );
        break;

      case "booking_confirmation":
        await sendBookingConfirmation(dummyAppointment, agencyBranding);
        break;

      case "new_booking_alert":
        await sendNewBookingAlert(dummyAppointment, agencyBranding);
        break;

      case "reschedule_customer":
        await sendRescheduleNotification(dummyAppointment, oldDate, "customer", agencyBranding);
        break;

      case "reschedule_surgeon":
        await sendRescheduleNotification(dummyAppointment, oldDate, "surgeon", agencyBranding);
        break;

      case "status_confirmed":
        await sendStatusChangeNotification(dummyAppointment, "confirmed", "customer", null, agencyBranding);
        break;

      case "status_cancelled":
        await sendStatusChangeNotification(dummyAppointment, "cancelled", "customer", "Surgeon unavailable on this date", agencyBranding);
        break;

      case "status_completed":
        await sendStatusChangeNotification(dummyAppointment, "completed", "customer", null, agencyBranding);
        break;

      case "status_no_show":
        await sendStatusChangeNotification(dummyAppointment, "no_show", "customer", null, agencyBranding);
        break;

      case "declaration_reminder":
        await sendDeclarationReminder(
          { customerId: 9999, customerName: "Alex Johnson", customerEmail: recipientEmail },
          agencyBranding,
        );
        break;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, templateType }, "Email preview send failed");
    res.status(500).json({ error: "Failed to send preview email" });
  }
});

export default router;
