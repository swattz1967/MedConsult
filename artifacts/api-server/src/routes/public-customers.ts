import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable, agenciesTable } from "@workspace/db";
import { z } from "zod";
import { sendRegistrationWelcome } from "../lib/email";
import { dispatchWebhook } from "../lib/webhook";

const router: IRouter = Router();

const PublicRegisterBody = z.object({
  firstName:              z.string().min(1),
  lastName:               z.string().min(1),
  email:                  z.string().email().optional().nullable(),
  phone:                  z.string().optional().nullable(),
  dialingCode:            z.string().optional().nullable(),
  nationality:            z.string().optional().nullable(),
  address:                z.string().optional().nullable(),
  postcode:               z.string().optional().nullable(),
  preferredLanguage:      z.string().optional().nullable(),
  medicalServicesInterest:z.string().optional().nullable(),
  heightCm:               z.number().optional().nullable(),
  weightKg:               z.number().optional().nullable(),
  heightUnit:             z.string().optional().nullable(),
  weightUnit:             z.string().optional().nullable(),
});

/**
 * POST /public/customers
 *
 * Public endpoint for external booking apps to register a customer into an
 * agency's database.
 *
 * Authentication: X-API-Key header — the secret key shown in the agency's
 * admin settings page.
 *
 * Example:
 *   POST https://your-domain.com/api/public/customers
 *   X-API-Key: <agency-api-key>
 *   Content-Type: application/json
 *   { "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com" }
 */
router.post("/public/customers", async (req, res): Promise<void> => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }

  const [agency] = await db
    .select()
    .from(agenciesTable)
    .where(eq(agenciesTable.apiKey, apiKey))
    .limit(1);

  if (!agency) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const parsed = PublicRegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const duplicate = parsed.data.email
    ? await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(eq(customersTable.email, parsed.data.email))
        .limit(1)
    : [];

  if (duplicate.length > 0) {
    res.status(409).json({ error: "A customer with this email already exists", customerId: duplicate[0].id });
    return;
  }

  const [customer] = await db
    .insert(customersTable)
    .values({ ...parsed.data, agencyId: agency.id })
    .returning();

  res.status(201).json(customer);

  (async () => {
    if (customer.email) {
      await sendRegistrationWelcome({
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email!,
        agency: {
          id: agency.id,
          name: agency.name,
          color: agency.primaryColor ?? "#145c4b",
          logoUrl: agency.logoUrl,
          email: agency.email,
        },
      });
    }

    await dispatchWebhook(agency.webhookUrl, agency.webhookSecret, {
      event: "customer.registered",
      timestamp: new Date().toISOString(),
      agencyId: agency.id,
      data: {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        nationality: customer.nationality,
        medicalServicesInterest: customer.medicalServicesInterest,
        createdAt: customer.createdAt,
      },
    });
  })().catch(() => {});
});

export default router;
