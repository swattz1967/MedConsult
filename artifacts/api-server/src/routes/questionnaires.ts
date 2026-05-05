import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, questionnairesTable, questionsTable, questionnaireResponsesTable } from "@workspace/db";
import {
  CreateQuestionnaireBody,
  GetQuestionnaireParams,
  UpdateQuestionnaireParams,
  UpdateQuestionnaireBody,
  DeleteQuestionnaireParams,
  ListQuestionnairesQueryParams,
  CreateQuestionParams,
  CreateQuestionBody,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
  ListQuestionsParams,
  SubmitQuestionnaireResponseBody,
  GetQuestionnaireResponseParams,
  UpdateQuestionnaireResponseParams,
  UpdateQuestionnaireResponseBody,
  ListQuestionnaireResponsesQueryParams,
} from "@workspace/api-zod";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

// --- QUESTIONNAIRES ---

router.get("/questionnaires", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const qp = ListQuestionnairesQueryParams.safeParse(req.query);
    const conditions = [];

    const agencyId = isAppOwner(req.currentUser)
      ? (qp.success && qp.data.agencyId ? qp.data.agencyId : null)
      : req.currentUser.agencyId;

    if (!isAppOwner(req.currentUser) && !agencyId) {
      res.status(403).json({ error: "Forbidden: no agency associated with this account" });
      return;
    }

    if (agencyId) conditions.push(eq(questionnairesTable.agencyId, agencyId));
    if (qp.success && qp.data.type) conditions.push(eq(questionnairesTable.type, qp.data.type));

    const questionnaires = conditions.length > 0
      ? await db.select().from(questionnairesTable).where(and(...conditions))
      : await db.select().from(questionnairesTable);
    res.json(questionnaires);
  } catch (err) {
    next(err);
  }
});

router.post("/questionnaires", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const parsed = CreateQuestionnaireBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const agencyId = isAppOwner(req.currentUser) ? parsed.data.agencyId : req.currentUser.agencyId;
    if (!agencyId) {
      res.status(400).json({ error: "No agency associated with this account" });
      return;
    }
    const { copyFromId, ...data } = parsed.data;

    if (copyFromId) {
      const [sourceQuestionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, copyFromId));
      if (!sourceQuestionnaire) {
        res.status(404).json({ error: "Source questionnaire not found" });
        return;
      }
      if (!assertAgencyAccess(req.currentUser, sourceQuestionnaire.agencyId, res)) return;
    }

    req.log.info({ agencyId, copyFromId: copyFromId ?? null }, "Creating questionnaire");
    const [questionnaire] = await db.insert(questionnairesTable)
      .values({ ...data, agencyId, isDefault: data.isDefault ?? false })
      .returning();

    if (copyFromId) {
      const sourceQuestions = await db.select().from(questionsTable).where(eq(questionsTable.questionnaireId, copyFromId));
      if (sourceQuestions.length > 0) {
        await db.insert(questionsTable).values(
          sourceQuestions.map(q => ({
            questionnaireId: questionnaire.id,
            text: q.text,
            type: q.type,
            options: q.options,
            isRequired: q.isRequired,
            sortOrder: q.sortOrder,
          }))
        );
      }
    }

    req.log.info({ questionnaireId: questionnaire.id }, "Questionnaire created");
    res.status(201).json(questionnaire);
  } catch (err) {
    next(err);
  }
});

router.get("/questionnaires/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = GetQuestionnaireParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [questionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.id));
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, questionnaire.agencyId, res)) return;
    const questions = await db.select().from(questionsTable)
      .where(eq(questionsTable.questionnaireId, params.data.id))
      .orderBy(questionsTable.sortOrder);
    res.json({ ...questionnaire, questions });
  } catch (err) {
    next(err);
  }
});

router.patch("/questionnaires/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = UpdateQuestionnaireParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateQuestionnaireBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [existing] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;

    req.log.info({ questionnaireId: params.data.id }, "Updating questionnaire");
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== null && value !== undefined) cleanData[key] = value;
    }
    const [q] = await db.update(questionnairesTable).set(cleanData).where(eq(questionnairesTable.id, params.data.id)).returning();
    if (!q) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    res.json(q);
  } catch (err) {
    next(err);
  }
});

router.delete("/questionnaires/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = DeleteQuestionnaireParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [existing] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;

    req.log.info({ questionnaireId: params.data.id }, "Deleting questionnaire");
    await db.delete(questionnairesTable).where(eq(questionnairesTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- QUESTIONS ---

router.get("/questionnaires/:questionnaireId/questions", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = ListQuestionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [questionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.questionnaireId));
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, questionnaire.agencyId, res)) return;
    const questions = await db.select().from(questionsTable)
      .where(eq(questionsTable.questionnaireId, params.data.questionnaireId))
      .orderBy(questionsTable.sortOrder);
    res.json(questions);
  } catch (err) {
    next(err);
  }
});

router.post("/questionnaires/:questionnaireId/questions", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = CreateQuestionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateQuestionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [questionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.questionnaireId));
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, questionnaire.agencyId, res)) return;

    req.log.info({ questionnaireId: params.data.questionnaireId }, "Adding question to questionnaire");
    const [question] = await db.insert(questionsTable).values({
      ...parsed.data,
      questionnaireId: params.data.questionnaireId,
      isRequired: parsed.data.isRequired ?? false,
      sortOrder: parsed.data.sortOrder ?? 0,
    }).returning();
    req.log.info({ questionId: question.id, questionnaireId: params.data.questionnaireId }, "Question added");
    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
});

router.patch("/questionnaires/:questionnaireId/questions/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = UpdateQuestionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateQuestionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [questionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.questionnaireId));
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, questionnaire.agencyId, res)) return;

    req.log.info({ questionId: params.data.id, questionnaireId: params.data.questionnaireId }, "Updating question");
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== null && value !== undefined) cleanData[key] = value;
    }
    const [question] = await db.update(questionsTable).set(cleanData)
      .where(and(eq(questionsTable.id, params.data.id), eq(questionsTable.questionnaireId, params.data.questionnaireId)))
      .returning();
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }
    res.json(question);
  } catch (err) {
    next(err);
  }
});

router.delete("/questionnaires/:questionnaireId/questions/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = DeleteQuestionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [questionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, params.data.questionnaireId));
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, questionnaire.agencyId, res)) return;

    req.log.info({ questionId: params.data.id, questionnaireId: params.data.questionnaireId }, "Deleting question");
    await db.delete(questionsTable)
      .where(and(eq(questionsTable.id, params.data.id), eq(questionsTable.questionnaireId, params.data.questionnaireId)));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- QUESTIONNAIRE RESPONSES ---

async function getResponseAgencyId(responseId: number): Promise<number | null> {
  const rows = await db
    .select({ agencyId: questionnairesTable.agencyId })
    .from(questionnaireResponsesTable)
    .innerJoin(questionnairesTable, eq(questionnaireResponsesTable.questionnaireId, questionnairesTable.id))
    .where(eq(questionnaireResponsesTable.id, responseId));
  return rows[0]?.agencyId ?? null;
}

router.get("/questionnaire-responses", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Customer path: return only responses for their own customer record
  if (!isAdminOrOwner(req.currentUser)) {
    const customerOwnId = req.currentUser.customerId;
    if (!customerOwnId) {
      res.json([]);
      return;
    }
    try {
      const rows = await db
        .select({ response: questionnaireResponsesTable })
        .from(questionnaireResponsesTable)
        .innerJoin(questionnairesTable, eq(questionnaireResponsesTable.questionnaireId, questionnairesTable.id))
        .where(eq(questionnaireResponsesTable.customerId, customerOwnId));
      res.json(rows.map(r => r.response));
    } catch (err) {
      next(err);
    }
    return;
  }

  // Admin / app_owner path
  const agencyId = isAppOwner(req.currentUser)
    ? (req.query.agencyId ? Number(req.query.agencyId) : null)
    : req.currentUser.agencyId;

  if (!isAppOwner(req.currentUser) && !agencyId) {
    res.status(403).json({ error: "Forbidden: no agency associated with this account" });
    return;
  }

  try {
    const qp = ListQuestionnaireResponsesQueryParams.safeParse(req.query);
    const responseConditions = [];
    if (qp.success) {
      if (qp.data.questionnaireId) responseConditions.push(eq(questionnaireResponsesTable.questionnaireId, qp.data.questionnaireId));
      if (qp.data.customerId) responseConditions.push(eq(questionnaireResponsesTable.customerId, qp.data.customerId));
      if (qp.data.appointmentId) responseConditions.push(eq(questionnaireResponsesTable.appointmentId, qp.data.appointmentId));
    }

    if (agencyId) {
      responseConditions.push(eq(questionnairesTable.agencyId, agencyId));
    }

    const rows = await db
      .select({ response: questionnaireResponsesTable })
      .from(questionnaireResponsesTable)
      .innerJoin(questionnairesTable, eq(questionnaireResponsesTable.questionnaireId, questionnairesTable.id))
      .where(responseConditions.length > 0 ? and(...responseConditions) : undefined);
    res.json(rows.map(r => r.response));
  } catch (err) {
    next(err);
  }
});

router.post("/questionnaire-responses", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const parsed = SubmitQuestionnaireResponseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [questionnaire] = await db.select().from(questionnairesTable).where(eq(questionnairesTable.id, parsed.data.questionnaireId));
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, questionnaire.agencyId, res)) return;
    req.log.info(
      { questionnaireId: parsed.data.questionnaireId, customerId: parsed.data.customerId, appointmentId: parsed.data.appointmentId ?? null },
      "Submitting questionnaire response",
    );
    const [response] = await db.insert(questionnaireResponsesTable).values(parsed.data).returning();
    req.log.info({ responseId: response.id }, "Questionnaire response submitted");
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.get("/questionnaire-responses/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = GetQuestionnaireResponseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [response] = await db.select().from(questionnaireResponsesTable).where(eq(questionnaireResponsesTable.id, params.data.id));
    if (!response) {
      res.status(404).json({ error: "Response not found" });
      return;
    }
    const responseAgencyId = await getResponseAgencyId(params.data.id);
    if (responseAgencyId === null) {
      res.status(404).json({ error: "Response not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, responseAgencyId, res)) return;
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.patch("/questionnaire-responses/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const params = UpdateQuestionnaireResponseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateQuestionnaireResponseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const responseAgencyId = await getResponseAgencyId(params.data.id);
    if (responseAgencyId === null) {
      res.status(404).json({ error: "Response not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, responseAgencyId, res)) return;
    req.log.info({ responseId: params.data.id }, "Updating questionnaire response");
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== null && value !== undefined) cleanData[key] = value;
    }
    const [response] = await db.update(questionnaireResponsesTable).set(cleanData)
      .where(eq(questionnaireResponsesTable.id, params.data.id)).returning();
    if (!response) {
      res.status(404).json({ error: "Response not found" });
      return;
    }
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
