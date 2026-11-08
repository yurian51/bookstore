# Update: payments, Google sign-in, reader, admin screens

This archive contains only new and changed files. Copy them over the existing project at the same paths.
Files not listed here are unchanged.

## New files
- apps/api/src/common/origin.middleware.ts: blocks cross-site state-changing requests.
- apps/api/src/orders/payment-webhook.controller.ts: `POST /api/payments/webhook`, verified by signature.
- apps/api/src/auth/google.controller.ts: Google sign-in (`/api/auth/google`, `/api/auth/google/callback`).
- apps/web/app/read/[formatId]/page.tsx: reader route, only for books in the user's library.
- apps/web/components/Reader.tsx: PDF viewer, EPUB reader with font size and bookmarks, audiobook player with resume.
- apps/web/app/admin/users/page.tsx and components/UserToggle.tsx: search and disable/re-enable accounts.
- apps/web/app/admin/orders/page.tsx and components/RefundButton.tsx: search orders, full or partial refunds.

## Changed files
- apps/api/package.json: adds `stripe`.
- apps/web/package.json: adds `epubjs`.
- apps/api/src/main.ts: `rawBody: true` so webhook signatures can be verified.
- apps/api/src/app.module.ts: registers the origin check.
- apps/api/src/auth/auth.module.ts: registers Google controller.
- apps/api/src/payments/stripe.provider.ts: real Stripe Checkout, refunds, webhook verification.
- apps/api/src/payments/payments.module.ts: passes the webhook secret to Stripe.
- apps/api/src/orders/orders.service.ts: webhook completion, failure handling, refunds, admin order list.
- apps/api/src/orders/orders.module.ts: registers webhook controller.
- apps/api/src/admin/admin.controller.ts and admin.module.ts: order list and refund endpoints.
- apps/web/components/LibraryDownload.tsx: "Read" now opens the in-app reader.
- apps/web/components/AuthForm.tsx: "Continue with Google" button.
- apps/web/app/login/page.tsx: shows Google sign-in errors.
- apps/web/app/admin/page.tsx: links to review, orders, users.
- .env.example: `STRIPE_WEBHOOK_SECRET` and corrected `GOOGLE_CALLBACK_URL`.

## Setup after copying
1. `npm install` from the project root.
2. Stripe dashboard: add a webhook endpoint pointing to `https://YOUR-API/api/payments/webhook`.
   Subscribe to `checkout.session.completed`, `checkout.session.async_payment_failed`, and `checkout.session.expired`.
   Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Set `PAYMENT_PROVIDER=stripe`.
3. Google Cloud console: add the authorized redirect URI `GOOGLE_CALLBACK_URL`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Confirm your Stripe account accepts each currency you show (TZS, KES, USD, EUR, GBP) before launch.

## Security decisions
- Google accounts are never auto-linked to an existing password account. Otherwise, whoever registered
  that email first could reach data from the Google identity. Users are asked to sign in with their password instead.
- Refunds revoke library access only when the order is fully refunded. Each refund is written to the audit log.
- Webhook amounts must match what was charged, or the event is rejected.

## Still not done
- Not compiled or run. The package registry was unreachable from the build sandbox.
- Password reset and email verification (needs a mail provider).
- Vendor dashboards (inventory, withdrawals), payouts, and publisher screens.
- Bookmarks for PDF (the browser viewer does not expose page positions).
- Dark mode inside the EPUB reader page.
- Malware scanning of uploads.
- Translations and PWA.
- README status table is out of date for Google sign-in, payments, and admin.
