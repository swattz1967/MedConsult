import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { agenciesTable } from "./agencies";

export const uploadTokensTable = pgTable("upload_tokens", {
  id: serial("id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  issuedByUserId: integer("issued_by_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  issuedByAgencyId: integer("issued_by_agency_id").references(() => agenciesTable.id, { onDelete: "cascade" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UploadToken = typeof uploadTokensTable.$inferSelect;
