import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agenciesTable } from "./agencies";

export const surgeonsTable = pgTable("surgeons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  agencyId: integer("agency_id").notNull().references(() => agenciesTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  specialization: text("specialization"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSurgeonSchema = createInsertSchema(surgeonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSurgeon = z.infer<typeof insertSurgeonSchema>;
export type Surgeon = typeof surgeonsTable.$inferSelect;
