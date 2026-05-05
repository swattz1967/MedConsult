import { Router, type IRouter } from "express";
import { eq, sql, getTableColumns } from "drizzle-orm";
import { db, customersTable, appointmentsTable, agenciesTable } from "@workspace/db";
import {
  CreateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
} from "@workspace/api-zod";
import { sendDeclarationReminder, sendRegistrationWelcome } from "../lib/email";
import { isAppOwner, isAdminOrOwner, assertAgencyAccess } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/customers", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  try {
    const customerCols = getTableColumns(customersTable);
    const query = db
      .select({
        ...customerCols,
        earnedFees: sql<number>`COALESCE(SUM(CASE WHEN ${appointmentsTable.status} = 'completed' AND ${appointmentsTable.fee} IS NOT NULL THEN ${appointmentsTable.fee}::numeric ELSE 0 END), 0)::float`,
        pendingFees: sql<number>`COALESCE(SUM(CASE WHEN ${appointmentsTable.status} = 'scheduled' AND ${appointmentsTable.fee} IS NOT NULL THEN ${appointmentsTable.fee}::numeric ELSE 0 END), 0)::float`,
      })
      .from(customersTable)
      .leftJoin(appointmentsTable, eq(appointmentsTable.customerId, customersTable.id))
      .groupBy(customersTable.id)
      .orderBy(customersTable.lastName);

    const agencyId = isAppOwner(req.currentUser)
      ? (req.query.agencyId ? Number(req.query.agencyId) : null)
      : req.currentUser.agencyId;

    if (!isAppOwner(req.currentUser) && !agencyId) {
      res.status(403).json({ error: "Forbidden: no agency associated with this account" });
      return;
    }

    const customers = agencyId
      ? await query.where(eq(customersTable.agencyId, agencyId))
      : await query;
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

router.post("/customers", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agencyId = isAppOwner(req.currentUser) ? parsed.data.agencyId : req.currentUser.agencyId;
  if (!agencyId) {
    res.status(400).json({ error: "No agency associated with this account" });
    return;
  }
  try {
    req.log.info({ agencyId }, "Creating customer");
    const [customer] = await db.insert(customersTable).values({ ...parsed.data, agencyId }).returning();
    req.log.info({ customerId: customer.id, agencyId: customer.agencyId }, "Customer created");
    res.status(201).json(customer);

    if (customer.email) {
      (async () => {
        const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, agencyId));
        await sendRegistrationWelcome({
          customerId: customer.id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email!,
          agency: {
            id: agency?.id,
            name: agency?.name ?? "MedConsult",
            color: agency?.primaryColor ?? "#145c4b",
            logoUrl: agency?.logoUrl,
            email: agency?.email,
          },
        });
      })().catch((err) => {
        req.log.error({ err, customerId: customer.id }, "Failed to send registration welcome email");
      });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/customers/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, customer.agencyId, res)) return;
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.patch("/customers/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;

    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== null && value !== undefined) cleanData[key] = value;
    }
    req.log.info({ customerId: params.data.id }, "Updating customer");
    const [customer] = await db
      .update(customersTable)
      .set(cleanData)
      .where(eq(customersTable.id, params.data.id))
      .returning();
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.delete("/customers/:id", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, existing.agencyId, res)) return;

    req.log.info({ customerId: params.data.id }, "Deleting customer");
    await db.delete(customersTable).where(eq(customersTable.id, params.data.id));
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

router.post("/customers/:id/send-declaration-reminder", async (req, res, next): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminOrOwner(req.currentUser)) {
    res.status(403).json({ error: "Forbidden: insufficient permissions" });
    return;
  }
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    req.log.info({ customerId: params.data.id }, "Sending declaration reminder");
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    if (!assertAgencyAccess(req.currentUser, customer.agencyId, res)) return;
    if (!customer.email) {
      res.status(400).json({ error: "Customer has no email address on file" });
      return;
    }
    if (customer.declarationSigned) {
      res.status(400).json({ error: "Customer has already signed their declaration" });
      return;
    }
    const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, customer.agencyId));
    const agencyBranding = agency
      ? { id: agency.id, name: agency.name, color: agency.primaryColor ?? "#145c4b", logoUrl: agency.logoUrl, email: agency.email }
      : undefined;

    await sendDeclarationReminder(
      { customerId: customer.id, customerName: `${customer.firstName} ${customer.lastName}`, customerEmail: customer.email },
      agencyBranding,
    );
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reminder email";
    req.log.error({ err }, "send-declaration-reminder failed");
    res.status(500).json({ error: message });
  }
});

export default router;
