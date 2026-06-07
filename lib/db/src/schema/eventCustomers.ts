import { pgTable, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { customersTable } from "./customers";

export const eventCustomersTable = pgTable("event_customers", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.eventId, t.customerId)]);

export const insertEventCustomerSchema = createInsertSchema(eventCustomersTable).omit({ id: true, createdAt: true });
export type InsertEventCustomer = z.infer<typeof insertEventCustomerSchema>;
export type EventCustomer = typeof eventCustomersTable.$inferSelect;
