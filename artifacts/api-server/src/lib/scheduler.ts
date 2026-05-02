import { and, eq, isNull, or, lt, isNotNull, lte } from "drizzle-orm";
import { db, reminderRulesTable, appointmentsTable, customersTable } from "@workspace/db";
import { sendDeclarationReminder } from "./email";
import { logger } from "./logger";

const COOLDOWN_HOURS = 20;

async function runReminderJob(): Promise<void> {
  logger.info("Declaration reminder scheduler: starting run");

  const rules = await db
    .select()
    .from(reminderRulesTable)
    .where(eq(reminderRulesTable.enabled, true));

  if (rules.length === 0) {
    logger.info("Declaration reminder scheduler: no enabled rules, skipping");
    return;
  }

  let totalSent = 0;

  for (const rule of rules) {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + rule.daysBeforeAppointment * 24 * 60 * 60 * 1000);
    const cooldownCutoff = new Date(now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000);

    const appointments = await db
      .select({
        appointment: appointmentsTable,
        customer: customersTable,
      })
      .from(appointmentsTable)
      .innerJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .where(
        and(
          eq(customersTable.agencyId, rule.agencyId),
          eq(customersTable.declarationSigned, false),
          isNotNull(customersTable.email),
          or(
            isNull(customersTable.lastDeclarationReminderSentAt),
            lt(customersTable.lastDeclarationReminderSentAt, cooldownCutoff.toISOString()),
          ),
        ),
      );

    const upcoming = appointments.filter((row) => {
      const start = new Date(row.appointment.startTime);
      return start > now && start <= windowEnd;
    });

    const seenCustomerIds = new Set<number>();
    let sent = 0;

    for (const { customer } of upcoming) {
      if (seenCustomerIds.has(customer.id)) continue;
      seenCustomerIds.add(customer.id);

      if (!customer.email) continue;

      try {
        await sendDeclarationReminder({
          customerId: customer.id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
        });

        await db
          .update(customersTable)
          .set({ lastDeclarationReminderSentAt: new Date().toISOString() })
          .where(eq(customersTable.id, customer.id));

        sent++;
        logger.info(
          { customerId: customer.id, agencyId: rule.agencyId },
          "Auto-reminder sent",
        );
      } catch (err) {
        logger.error(
          { err, customerId: customer.id },
          "Failed to send auto-reminder",
        );
      }
    }

    if (sent > 0) {
      await db
        .update(reminderRulesTable)
        .set({
          lastRunAt: new Date().toISOString(),
          remindersSentTotal: rule.remindersSentTotal + sent,
        })
        .where(eq(reminderRulesTable.id, rule.id));
    } else {
      await db
        .update(reminderRulesTable)
        .set({ lastRunAt: new Date().toISOString() })
        .where(eq(reminderRulesTable.id, rule.id));
    }

    totalSent += sent;
    logger.info(
      { agencyId: rule.agencyId, sent },
      "Declaration reminder scheduler: rule processed",
    );
  }

  logger.info({ totalSent }, "Declaration reminder scheduler: run complete");
}

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startScheduler(): void {
  logger.info("Declaration reminder scheduler started (interval: 1 hour)");

  runReminderJob().catch((err) =>
    logger.error({ err }, "Scheduler initial run failed"),
  );

  setInterval(() => {
    runReminderJob().catch((err) =>
      logger.error({ err }, "Scheduler run failed"),
    );
  }, INTERVAL_MS);
}
