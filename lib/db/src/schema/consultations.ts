import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";
import { surgeonsTable } from "./surgeons";
import { customersTable } from "./customers";

export const consultationRecordsTable = pgTable("consultation_records", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointmentsTable.id, { onDelete: "cascade" }),
  surgeonId: integer("surgeon_id").notNull().references(() => surgeonsTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  notes: text("notes"),
  surgeonAnswers: text("surgeon_answers"),
  status: text("status").notNull().default("in_progress"),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const consultationMediaTable = pgTable("consultation_media", {
  id: serial("id").primaryKey(),
  consultationRecordId: integer("consultation_record_id").notNull().references(() => consultationRecordsTable.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConsultationRecordSchema = createInsertSchema(consultationRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConsultationMediaSchema = createInsertSchema(consultationMediaTable).omit({ id: true, createdAt: true });

export type InsertConsultationRecord = z.infer<typeof insertConsultationRecordSchema>;
export type ConsultationRecord = typeof consultationRecordsTable.$inferSelect;
export type InsertConsultationMedia = z.infer<typeof insertConsultationMediaSchema>;
export type ConsultationMedia = typeof consultationMediaTable.$inferSelect;
