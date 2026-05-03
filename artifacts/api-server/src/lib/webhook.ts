import { createHmac } from "crypto";
import { logger } from "./logger";

export type WebhookEventType =
  | "customer.registered"
  | "appointment.created"
  | "appointment.status_changed"
  | "appointment.rescheduled";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  agencyId: number;
  data: Record<string, unknown>;
}

/**
 * Deliver a signed webhook to the agency's configured webhookUrl.
 *
 * Signature: HMAC-SHA256 of the raw JSON body, sent as
 *   X-Webhook-Signature: sha256=<hex>
 *
 * The receiving server can verify authenticity by computing the same HMAC
 * with the shared secret and comparing it to the header value.
 *
 * Fire-and-forget — never throws; failures are logged.
 */
export async function dispatchWebhook(
  webhookUrl: string | null | undefined,
  webhookSecret: string | null | undefined,
  payload: WebhookPayload,
): Promise<void> {
  if (!webhookUrl) return;

  const body = JSON.stringify(payload);
  const signature = webhookSecret
    ? `sha256=${createHmac("sha256", webhookSecret).update(body).digest("hex")}`
    : undefined;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MedConsult-Webhook/1.0",
        ...(signature ? { "X-Webhook-Signature": signature } : {}),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn(
        { webhookUrl, event: payload.event, status: res.status },
        "Webhook delivery failed with non-2xx status",
      );
    } else {
      logger.info(
        { webhookUrl, event: payload.event, status: res.status },
        "Webhook delivered",
      );
    }
  } catch (err) {
    logger.error(
      { err, webhookUrl, event: payload.event },
      "Webhook delivery error",
    );
  }
}
