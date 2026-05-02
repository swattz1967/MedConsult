import { pgTable, serial, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agenciesTable } from "./agencies";

export const reminderRulesTable = pgTable("declaration_reminder_rules", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agenciesTable.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  daysBeforeAppointment: integer("days_before_appointment").notNull().default(3),
  lastRunAt: text("last_run_at"),
  remindersSentTotal: integer("reminders_sent_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReminderRuleSchema = createInsertSchema(reminderRulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReminderRule = z.infer<typeof insertReminderRuleSchema>;
export type ReminderRule = typeof reminderRulesTable.$inferSelect;
