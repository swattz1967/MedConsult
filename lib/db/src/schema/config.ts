import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agenciesTable } from "./agencies";

export const configItemsTable = pgTable("config_items", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agenciesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConfigItemSchema = createInsertSchema(configItemsTable).omit({ id: true, createdAt: true });
export type InsertConfigItem = z.infer<typeof insertConfigItemSchema>;
export type ConfigItem = typeof configItemsTable.$inferSelect;
