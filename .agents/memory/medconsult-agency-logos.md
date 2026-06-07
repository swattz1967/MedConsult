---
name: MedConsult agency logos
description: How agency logos are stored and served so <img> tags (and public pages + PDFs) can load them
---

# Agency logos are served via a dedicated PUBLIC route

Agency `logoUrl` is rendered in `<img>` tags on PUBLIC pages (register, events-list,
booking, event-public) and the admin sidebar/header, and is fetched server-side
unauthenticated for PDF generation. Therefore logos CANNOT live behind the
authenticated `/api/storage/objects/*` route (that route requires a Clerk Bearer
token, which `<img>` cannot send → 401; its ACL only recognizes consultation media).

**Rule:** logos are served from the public route `GET /api/storage/agency-logos/*path`
(mounted in the PUBLIC section of `routes/index.ts`). That route only serves an object
if its full public URL exactly equals some agency's `logoUrl` (DB-backed allowlist),
which prevents arbitrary private-object enumeration.

**Storage convention:** `logoUrl` is persisted as `/api/storage/agency-logos/<path>`.
The upload success handler in `agencies.tsx` builds this from `res.objectKey`
(`/objects/uploads/<uuid>`) by stripping the leading `/objects`.

**Why:** an authenticated route can never back an `<img src>` or an unauthenticated
server-side PDF fetch.

**How to apply:** never point a logo (or any browser-`<img>`-loaded asset) at
`/api/storage/objects/*`. The agencies create/update route validates that `logoUrl`
must start with `/api/storage/agency-logos/` so a privileged user can't "publish" an
arbitrary private object by setting it as their logo.

## Logos in server-side PDFs

PDF generation (schedule report, consultation record) must NOT HTTP-fetch
`agency.logoUrl` — it is a RELATIVE path so `new URL()` throws and the fetch silently
fails (logo then degrades to agency-name text). Instead read bytes directly from
object storage via `ObjectStorageService.readLogoBuffer(logoUrl, maxBytes)`.

**Also: PDFKit `doc.image()` only embeds PNG/JPEG.** The logo upload accepts SVG and
WebP too (the seeded agency logo is SVG), so `readLogoBuffer` rasterizes any
non-PNG/JPEG image to PNG with `sharp`. `sharp` is a native module — it's in the
`build.mjs` esbuild `external` list and imported dynamically; don't try to bundle it.

**Why:** an `<img>`-renderable URL is not the same as a PDFKit-embeddable image, and a
relative URL can never be fetched over HTTP server-side.
