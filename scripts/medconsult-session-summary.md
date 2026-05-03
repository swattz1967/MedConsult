# MedConsult — Build Session Summary

**Session Date:** 3 May 2026  
**Prepared for:** amswatton@hotmail.com  
**App:** https://medical-visit-manager--amswatton.replit.app

---

## Contents

1. [Project Overview & Technology Stack](#1-project-overview--technology-stack)
2. [Bug Fixes Completed Earlier](#2-bug-fixes-completed-earlier)
3. [External API — Register Customers from Beespoke-Med-Istanbul](#3-external-api--register-customers-from-beespoke-med-istanbul)
4. [Outbound Webhooks — Real-time Push Notifications](#4-outbound-webhooks--real-time-push-notifications)
5. [Admin UI Changes](#5-admin-ui-changes)
6. [Database Schema Changes](#6-database-schema-changes)
7. [Files Created / Modified](#7-files-created--modified)
8. [Quick Reference](#8-quick-reference)

---

## 1. Project Overview & Technology Stack

**MedConsult** is a multi-tenant Surgeon Consultation Management web application. Two agencies currently exist: **Premier Medical Group** (GBP) and **Beespoke-Med-Istanbul** (EUR).

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, TypeScript, Wouter routing |
| UI components | shadcn/ui, Tailwind CSS |
| Auth | Clerk (multi-tenant sign-in/sign-up) |
| Data fetching | TanStack React Query |
| Internationalisation | react-i18next |
| Backend | Express 5, Pino structured logging |
| Database ORM | Drizzle ORM + PostgreSQL |
| Email | Resend API with per-agency branded templates |
| File storage | Google Cloud Object Storage |
| Monorepo | pnpm workspaces |
| API contracts | OpenAPI YAML → Orval codegen (auto-generates React Query hooks + Zod validators) |

### How the monorepo is structured

| Package | Purpose |
|---|---|
| `lib/db` | Drizzle ORM schema + database client. Run `pnpm --filter @workspace/db run push` to apply schema changes. |
| `lib/api-spec` | Single OpenAPI YAML file. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate everything. |
| `lib/api-client-react` | Auto-generated TanStack React Query hooks (e.g. `useListCustomers`, `useCreateAgency`) |
| `lib/api-zod` | Auto-generated Zod validators — used server-side to validate request bodies |
| `artifacts/api-server` | Express API server — all backend routes live here |
| `artifacts/medconsult` | React frontend — the admin portal users see |

> **Key workflow:** Edit the OpenAPI spec → run codegen → TypeScript errors guide you to update both the server route and the frontend hook. Everything stays in sync automatically.

---

## 2. Bug Fixes Completed Earlier

### A. Company Logo Uploads
The `useUpload` hook was sending the wrong field names. Fixed to send `fileName` and expect back `uploadUrl` / `objectKey`. The Zod schema and storage route handler were aligned to match. Logos are stored at `/api/storage/objects/<uuid>` and served via a dedicated GET route.

### B. Logo Rendering in Emails
Email clients cannot load relative URLs like `/api/storage/objects/…`. Fixed by having `emailWrapper()` resolve relative paths to absolute `https://` URLs using `getBaseUrl()`, which reads the `REPLIT_DOMAINS` environment variable to determine the live domain.

### C. Agency Website Field
Replaced strict `z.string().url()` validation with a lenient custom validator. Changed the HTML input from `type="url"` to `type="text"`, and `https://` is now auto-prepended on blur if the user types a bare domain like `www.example.com`.

### D. Agency Search Bar
Added a live search bar to the Agencies page that filters by agency name, email, or website in real time. Clears with a ✕ button. Shows a "No agencies match…" empty state when there are no results.

---

## 3. External API — Register Customers from Beespoke-Med-Istanbul

This allows the **Beespoke-Med-Istanbul booking website** to automatically add customers into MedConsult whenever someone registers on that site.

**Endpoint:** `POST /api/public/customers`  
**Authentication:** `X-API-Key: <your-api-key>` header  
**No login session required** — this is a machine-to-machine call from your booking app's server.

### How to get the API Key

1. Log in to MedConsult
2. Go to **Agencies** → click **Edit** next to Beespoke-Med-Istanbul
3. Scroll down to **External API Integration**
4. Click **Generate Key**
5. Click the eye icon to reveal it, then copy it
6. Store it in your booking app as an environment variable (never put secrets in source code)

### Example call — curl

```bash
curl -X POST https://medical-visit-manager--amswatton.replit.app/api/public/customers \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+90532123456",
    "dialingCode": "+90",
    "nationality": "Turkish",
    "medicalServicesInterest": "Dental Implants"
  }'
```

### Example call — JavaScript / Node.js

```js
const response = await fetch(
  'https://medical-visit-manager--amswatton.replit.app/api/public/customers',
  {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.MEDCONSULT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: customer.firstName,
      lastName:  customer.lastName,
      email:     customer.email,
      phone:     customer.phone,
      nationality: customer.nationality,
      medicalServicesInterest: eventCategory,
    }),
  }
);

if (response.status === 409) {
  // Customer already exists — use their existing ID
  const { customerId } = await response.json();
} else if (response.ok) {
  const newCustomer = await response.json();
  console.log('Created customer ID:', newCustomer.id);
}
```

### All accepted fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | ✓ | |
| `lastName` | string | ✓ | |
| `email` | string | | Triggers a branded welcome email if provided |
| `phone` | string | | |
| `dialingCode` | string | | e.g. `"+90"` |
| `nationality` | string | | |
| `address` | string | | |
| `postcode` | string | | |
| `preferredLanguage` | string | | |
| `medicalServicesInterest` | string | | |
| `heightCm` | number | | |
| `weightKg` | number | | |
| `heightUnit` | string | | `"cm"` or `"ft"` |
| `weightUnit` | string | | `"kg"` or `"lbs"` |

### Response codes

| Code | Meaning | What to do |
|---|---|---|
| `201 Created` | Customer created successfully | Response body is the full customer record including their new `id` |
| `400 Bad Request` | Validation error | Check the field names and types in your request |
| `401 Unauthorized` | Missing or invalid API key | Check the `X-API-Key` header; regenerate in agency settings if needed |
| `409 Conflict` | Customer with that email already exists | Response includes `{ "customerId": 42 }` — use this to link the new booking to the existing record |

---

## 4. Outbound Webhooks — Real-time Push Notifications

MedConsult can push real-time notifications to your Beespoke booking site whenever something happens. Your booking site receives the data instantly and can react: update its own database, send an SMS, trigger a workflow, etc.

### Setting up the webhook

1. Log in to MedConsult
2. Go to **Agencies → Edit Beespoke-Med-Istanbul → External API Integration → Outbound Webhook**
3. Enter your webhook URL (e.g. `https://www.beespoke-med-istanbul.com/webhooks/medconsult`) and click **Save**
4. Click **Generate Secret** — copy the value into your booking app's environment variables as `MEDCONSULT_WEBHOOK_SECRET`

### Events delivered

| Event type | When it fires | Key data fields |
|---|---|---|
| `customer.registered` | Customer created via the public API | customerId, firstName, lastName, email, medicalServicesInterest |
| `appointment.created` | New appointment booked in MedConsult | appointmentId, customerId, surgeonId, startTime, status, fee |
| `appointment.status_changed` | Status changes: confirmed / cancelled / completed / no-show | appointmentId, status, previousStatus, customer |
| `appointment.rescheduled` | Appointment date/time moved | appointmentId, startTime, previousStartTime, customer |

### Webhook payload structure

```json
{
  "event": "appointment.status_changed",
  "timestamp": "2026-05-03T10:30:00.000Z",
  "agencyId": 2,
  "data": {
    "appointmentId": 42,
    "customerId": 7,
    "surgeonId": 3,
    "eventId": 5,
    "startTime": "2026-06-15T09:00:00",
    "endTime": "2026-06-15T09:30:00",
    "status": "confirmed",
    "previousStatus": "scheduled",
    "fee": 150,
    "customer": {
      "id": 7,
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com"
    }
  }
}
```

### Why verify the signature?

Every webhook includes an `X-Webhook-Signature` header. This lets your server confirm the request genuinely came from MedConsult and wasn't forged or tampered with. It uses HMAC-SHA256 — the same method used by Stripe, GitHub, and Shopify.

> **Important:** You must read the **raw request body** (before JSON parsing) when computing the HMAC. Most frameworks offer a way to access the raw bytes — see examples below.

### Verification — Node.js / Express

```js
const crypto = require('crypto');

// IMPORTANT: use express.raw() on this route, not express.json()
app.post('/webhooks/medconsult',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    // e.g. "sha256=a1b2c3d4e5..."

    const expected = 'sha256=' + crypto
      .createHmac('sha256', process.env.MEDCONSULT_WEBHOOK_SECRET)
      .update(req.body)   // <-- raw Buffer, not parsed JSON
      .digest('hex');

    if (signature !== expected) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Safe to parse now
    const payload = JSON.parse(req.body);

    switch (payload.event) {
      case 'customer.registered':
        // e.g. add them to your CRM
        break;
      case 'appointment.created':
        // e.g. update booking status
        break;
      case 'appointment.status_changed':
        // e.g. send an SMS
        break;
      case 'appointment.rescheduled':
        // e.g. update calendar
        break;
    }

    res.sendStatus(200); // Always respond quickly — MedConsult times out after 10 seconds
  }
);
```

### Verification — PHP (Laravel)

```php
Route::post('/webhooks/medconsult', function (Request $request) {
    $signature = $request->header('X-Webhook-Signature');
    $expected  = 'sha256=' . hash_hmac(
        'sha256',
        $request->getContent(),   // raw body string
        config('services.medconsult.webhook_secret')
    );

    if (!hash_equals($expected, $signature)) {
        abort(401, 'Invalid signature');
    }

    $payload = $request->json()->all();
    // handle $payload['event'] ...
    return response('', 200);
});
```

> **Delivery behaviour:** Webhooks time out after **10 seconds**. If your server returns a non-2xx status or doesn't respond in time, MedConsult logs a warning but does not retry automatically. Always return `200` as fast as possible and handle heavy processing asynchronously in a queue.

---

## 5. Admin UI Changes

All of the above is configurable from the **Agencies** page without writing any code:

- Click **Edit** on any agency
- Scroll to the **External API Integration** section (only shown when editing an existing agency)
- **API Key:** Generate, reveal (eye icon), copy, or regenerate. If you regenerate, the old key stops working immediately — update your booking app's environment variable.
- **Webhook URL:** Enter or update the destination URL and click Save
- **Signing Secret:** Generate, reveal, copy, or rotate. Rotating invalidates the old secret — update your booking app.

---

## 6. Database Schema Changes

The following columns were added to the `agencies` table and applied with `drizzle-kit push`:

| Column | Type | Purpose |
|---|---|---|
| `api_key` | text (nullable) | Secret key for the external customer registration API |
| `webhook_url` | text (nullable) | URL to POST webhook events to |
| `webhook_secret` | text (nullable) | HMAC-SHA256 signing secret for webhook verification |

---

## 7. Files Created / Modified

| File | Type | What changed |
|---|---|---|
| `lib/db/src/schema/agencies.ts` | Modified | Added `apiKey`, `webhookUrl`, `webhookSecret` columns |
| `artifacts/api-server/src/routes/public-customers.ts` | **New file** | Public customer registration endpoint (`POST /public/customers`) |
| `artifacts/api-server/src/lib/webhook.ts` | **New file** | Signed webhook dispatcher utility (HMAC-SHA256) |
| `artifacts/api-server/src/routes/agencies.ts` | Modified | Added `regenerate-api-key` and `regenerate-webhook-secret` endpoints |
| `artifacts/api-server/src/routes/appointments.ts` | Modified | Added `dispatchWebhook` calls on create, status change, and reschedule |
| `artifacts/api-server/src/routes/index.ts` | Modified | Registered the new `publicCustomersRouter` (outside Clerk auth middleware) |
| `lib/api-spec/openapi.yaml` | Modified | Added all new paths, schemas, and `webhookUrl`/`webhookSecret`/`apiKey` fields to Agency schema |
| `artifacts/medconsult/src/pages/admin/agencies.tsx` | Modified | Added External API Integration panel (API key + webhook URL + webhook secret) to agency edit dialog |

---

## 8. Quick Reference

**Production URL:** https://medical-visit-manager--amswatton.replit.app  
**External API endpoint:** `POST /api/public/customers`  
**Authentication header:** `X-API-Key: <key from agency settings>`

**Webhook events:** `customer.registered` · `appointment.created` · `appointment.status_changed` · `appointment.rescheduled`  
**Webhook signature header:** `X-Webhook-Signature: sha256=<hmac>`

**Admin panel:** Agencies → Edit Beespoke-Med-Istanbul → External API Integration

### Environment variables to store in your booking app

| Variable name (suggested) | Value | Where to get it |
|---|---|---|
| `MEDCONSULT_API_KEY` | The 64-char hex API key | Agencies → Edit → Generate Key |
| `MEDCONSULT_WEBHOOK_SECRET` | The 64-char hex signing secret | Agencies → Edit → Generate Secret |
| `MEDCONSULT_BASE_URL` | `https://medical-visit-manager--amswatton.replit.app` | Fixed — your app's production domain |

---

*Generated by Replit Agent on 3 May 2026 · MedConsult v1.0*
