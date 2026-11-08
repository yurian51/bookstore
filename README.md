# Global Bookstore

A multi-vendor bookstore and digital book marketplace. Monorepo with a NestJS API,
a Next.js web app, a Prisma/PostgreSQL schema, and a shared package for currency,
commission and validation logic.

## Layout

```
apps/api        NestJS REST API (auth, catalog, cart, orders, reader, authors, admin, account)
apps/web        Next.js 14 storefront, dashboards, reader library
packages/shared Money (integer minor units), commission math, Zod schemas
```

## Quick start

Requirements: Node 20+, PostgreSQL 15+.

```bash
cp .env.example .env            # set DATABASE_URL and the two *_SECRET values
npm install
cd apps/api && npx prisma migrate dev --name init && npx prisma generate && cd ../..
npm run db:seed                 # DEVELOPMENT DATA ONLY
npm run dev:api                 # http://localhost:4000
npm run dev:web                 # http://localhost:3000
```

Demo login (development seed only): `admin@demo.local` / `ChangeMe-Dev-123`.
Change or delete this account before any shared or public deployment.

## What is implemented

- Accounts: scrypt password hashing, server-side sessions, HttpOnly cookies, role-based guards.
- Catalog: search over title, author, ISBN and publisher; category tree; homepage shelves from real queries.
- Cart and checkout: all prices recomputed on the server from the database. Client-sent prices are ignored.
- Multi-currency: TZS, KES, USD, EUR, GBP as integer minor units. Per-country price rules and VAT.
- Commission: per-vendor override or platform default, applied per order line.
- Digital delivery: files live outside the web root. Access requires a library entry and a short-lived HMAC-signed token.
- Reader: library, reading progress, bookmarks, sample endpoints.
- Authors: submit books with a copyright declaration; books stay private until approved and published.
- Admin: review queue, approve/reject/publish, vendor status, user disable and roles, commission and geography reports.
- Audit logging for admin actions.

## What is NOT yet production-ready

These are deliberate stubs. Each has a single place to replace.

| Area | Current state | To finish |
|---|---|---|
| Payments | `sandbox` completes instantly (dev only). `stripe` adapter throws until wired. | Implement `stripe.provider.ts` with the official SDK and webhook signature verification. PayPal and mobile money follow the same interface. |
| Google sign-in | Env keys exist, no OAuth route. | Add a passport/OIDC flow that links `User.googleId`. |
| Email verification and notifications | Not sent. | Add a mailer service and a verification step. |
| Search | PostgreSQL `contains` queries. | Swap in OpenSearch behind `CatalogService` for relevance and typo tolerance. |
| File storage | Local `STORAGE_DIR`. Uploads are sniffed by content (magic bytes), stored under server-generated names, and only digital files are served through signed links. | Implement an S3-compatible adapter behind `StorageService`. Add malware scanning for uploads. |
| Exchange rates | Table exists, no feed. | Add a rate provider job that writes `ExchangeRate`. |
| Shipping | Single flat fee per zone. | Integrate carrier rate APIs. |
| AI recommendations | Not built. Spec requires no invented book data. | Start with co-purchase and category heuristics. |
| Author dashboard | Apply, create book, add formats, upload files and cover, submit for review, sales by currency. | Vendor inventory, refund, and withdrawal UIs are not built. |
| Admin UI | Overview and review queue (approve, reject, publish). User management and reports are API-only. | Build user and report pages. |
| Internationalization | Locale is stored; UI strings are English. | Add an i18n catalog and translate. |
| Mobile apps, PWA | Not built. | Add manifest and service worker for PWA. |

## Security notes

- Secrets come only from environment variables. Production refuses to start with placeholder secrets.
- The sandbox payment provider refuses to run when `NODE_ENV=production`.
- Card data is never handled by this application. Payment providers use hosted checkout.
- Session tokens are random and stored hashed (SHA-256).
- Password reset, email verification, and CSRF hardening for cookie-authenticated POST routes should be added before launch.
