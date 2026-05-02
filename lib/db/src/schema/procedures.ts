import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { surgeonsTable } from "./surgeons";

export const proceduresTable = pgTable("procedures", {
  id: serial("id").primaryKey(),
  surgeonId: integer("surgeon_id").notNull().references(() => surgeonsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProcedureSchema = createInsertSchema(proceduresTable).omit({ id: true, createdAt: true });
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;
export type Procedure = typeof proceduresTable.$inferSelect;
