import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { agenciesTable } from "./agencies";

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").references(() => agenciesTable.id, { onDelete: "set null" }),
  templateType: text("template_type").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientType: text("recipient_type").notNull().default("customer"),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  appointmentId: integer("appointment_id"),
  customerId: integer("customer_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmailLog = typeof emailLogsTable.$inferSelect;
