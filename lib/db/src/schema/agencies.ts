import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agenciesTable = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  logoUrl: text("logo_url"),
  website: text("website"),
  phone: text("phone"),
  address: text("address"),
  currency: text("currency").notNull().default("GBP"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAgencySchema = createInsertSchema(agenciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgency = z.infer<typeof insertAgencySchema>;
export type Agency = typeof agenciesTable.$inferSelect;
