import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agenciesTable } from "./agencies";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agenciesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dialingCode: text("dialing_code"),
  nationality: text("nationality"),
  address: text("address"),
  postcode: text("postcode"),
  preferredLanguage: text("preferred_language"),
  medicalServicesInterest: text("medical_services_interest"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  heightUnit: text("height_unit").default("cm"),
  weightUnit: text("weight_unit").default("kg"),
  declarationSigned: boolean("declaration_signed").notNull().default(false),
  declarationSignedAt: text("declaration_signed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
