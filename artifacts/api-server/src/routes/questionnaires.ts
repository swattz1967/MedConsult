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

const router: IRouter = Router();

// --- QUESTIONNAIRES ---

router.get("/questionnaires", async (req, res, next): Promise<void> => {
  try {
    const qp = ListQuestionnairesQueryParams.safeParse(req.query);
    const conditions = [];
    if (qp.success) {
      if (qp.data.agencyId) conditions.push(eq(questionnairesTable.agencyId, qp.data.agencyId));
      if (qp.data.type) conditions.push(eq(questionnairesTable.type, qp.data.type));
    }
    const questionnaires = conditions.length > 0
      ? await db.select().from(questionnairesTable).where(and(...conditions))
      : await db.select().from(questionnairesTable);
    res.json(questionnaires);
  } catch (err) {
    next(err);
  }
});

router.post("/questionnaires", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateQuestionnaireBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { copyFromId, ...data } = parsed.data;
    req.log.info({ agencyId: data.agencyId, copyFromId: copyFromId ?? null }, "Creating questionnaire");
    const [questionnaire] = await db.insert(questionnairesTable)
      .values({ ...data, isDefault: data.isDefault ?? false })
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
    const questions = await db.select().from(questionsTable)
      .where(eq(questionsTable.questionnaireId, params.data.id))
      .orderBy(questionsTable.sortOrder);
    res.json({ ...questionnaire, questions });
  } catch (err) {
    next(err);
  }
});

router.patch("/questionnaires/:id", async (req, res, next): Promise<void> => {
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
  try {
    const params = DeleteQuestionnaireParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    req.log.info({ questionnaireId: params.data.id }, "Deleting questionnaire");
    await db.delete(questionnairesTable).where(eq(questionnairesTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- QUESTIONS ---

router.get("/questionnaires/:questionnaireId/questions", async (req, res, next): Promise<void> => {
  try {
    const params = ListQuestionsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const questions = await db.select().from(questionsTable)
      .where(eq(questionsTable.questionnaireId, params.data.questionnaireId))
      .orderBy(questionsTable.sortOrder);
    res.json(questions);
  } catch (err) {
    next(err);
  }
});

router.post("/questionnaires/:questionnaireId/questions", async (req, res, next): Promise<void> => {
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
  try {
    const params = DeleteQuestionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    req.log.info({ questionId: params.data.id, questionnaireId: params.data.questionnaireId }, "Deleting question");
    await db.delete(questionsTable)
      .where(and(eq(questionsTable.id, params.data.id), eq(questionsTable.questionnaireId, params.data.questionnaireId)));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// --- QUESTIONNAIRE RESPONSES ---

router.get("/questionnaire-responses", async (req, res, next): Promise<void> => {
  try {
    const qp = ListQuestionnaireResponsesQueryParams.safeParse(req.query);
    const conditions = [];
    if (qp.success) {
      if (qp.data.questionnaireId) conditions.push(eq(questionnaireResponsesTable.questionnaireId, qp.data.questionnaireId));
      if (qp.data.customerId) conditions.push(eq(questionnaireResponsesTable.customerId, qp.data.customerId));
      if (qp.data.appointmentId) conditions.push(eq(questionnaireResponsesTable.appointmentId, qp.data.appointmentId));
    }
    const responses = conditions.length > 0
      ? await db.select().from(questionnaireResponsesTable).where(and(...conditions))
      : await db.select().from(questionnaireResponsesTable);
    res.json(responses);
  } catch (err) {
    next(err);
  }
});

router.post("/questionnaire-responses", async (req, res, next): Promise<void> => {
  try {
    const parsed = SubmitQuestionnaireResponseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
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
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.patch("/questionnaire-responses/:id", async (req, res, next): Promise<void> => {
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
