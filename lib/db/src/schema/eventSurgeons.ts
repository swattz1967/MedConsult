import { pgTable, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { surgeonsTable } from "./surgeons";

export const eventSurgeonsTable = pgTable("event_surgeons", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  surgeonId: integer("surgeon_id").notNull().references(() => surgeonsTable.id, { onDelete: "cascade" }),
  defaultFee: real("default_fee"),
  defaultSlotMinutes: integer("default_slot_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSurgeonSchema = createInsertSchema(eventSurgeonsTable).omit({ id: true, createdAt: true });
export type InsertEventSurgeon = z.infer<typeof insertEventSurgeonSchema>;
export type EventSurgeon = typeof eventSurgeonsTable.$inferSelect;
