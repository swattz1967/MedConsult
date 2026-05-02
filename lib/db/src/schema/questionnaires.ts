import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agenciesTable } from "./agencies";

export const questionnairesTable = pgTable("questionnaires", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull().references(() => agenciesTable.id, { onDelete: "cascade" }),
  surgeonId: integer("surgeon_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  questionnaireId: integer("questionnaire_id").notNull().references(() => questionnairesTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  type: text("type").notNull().default("text"),
  options: text("options"),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionnaireResponsesTable = pgTable("questionnaire_responses", {
  id: serial("id").primaryKey(),
  questionnaireId: integer("questionnaire_id").notNull().references(() => questionnairesTable.id, { onDelete: "cascade" }),
  appointmentId: integer("appointment_id"),
  customerId: integer("customer_id").notNull(),
  answers: text("answers").notNull().default("{}"),
  submittedAt: text("submitted_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuestionnaireSchema = createInsertSchema(questionnairesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export const insertQuestionnaireResponseSchema = createInsertSchema(questionnaireResponsesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type Questionnaire = typeof questionnairesTable.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
export type InsertQuestionnaireResponse = z.infer<typeof insertQuestionnaireResponseSchema>;
export type QuestionnaireResponse = typeof questionnaireResponsesTable.$inferSelect;
