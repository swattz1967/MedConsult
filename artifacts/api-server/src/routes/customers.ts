import { Router, type IRouter } from "express";
import { eq, sql, getTableColumns } from "drizzle-orm";
import { db, customersTable, appointmentsTable, agenciesTable } from "@workspace/db";
import {
  CreateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
  ListCustomersQueryParams,
} from "@workspace/api-zod";
import { sendDeclarationReminder, sendRegistrationWelcome } from "../lib/email";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const qp = ListCustomersQueryParams.safeParse(req.query);
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
  const customers = qp.success && qp.data.agencyId
    ? await query.where(eq(customersTable.agencyId, qp.data.agencyId))
    : await query;
  res.json(customers);
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db.insert(customersTable).values(parsed.data).returning();
  res.status(201).json(customer);

  // Fire-and-forget: send branded welcome email after response is sent
  if (customer.email) {
    (async () => {
      const [agency] = await db
        .select()
        .from(agenciesTable)
        .where(eq(agenciesTable.id, parsed.data.agencyId));

      await sendRegistrationWelcome({
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email!,
        agency: {
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
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(customer);
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
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
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== null && value !== undefined) cleanData[key] = value;
  }
  const [customer] = await db.update(customersTable).set(cleanData).where(eq(customersTable.id, params.data.id)).returning();
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(customer);
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(customersTable).where(eq(customersTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/customers/:id/send-declaration-reminder", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  if (!customer.email) {
    res.status(400).json({ error: "Customer has no email address on file" });
    return;
  }
  if (customer.declarationSigned) {
    res.status(400).json({ error: "Customer has already signed their declaration" });
    return;
  }
  try {
    await sendDeclarationReminder({
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to send reminder email" });
  }
});

export default router;
