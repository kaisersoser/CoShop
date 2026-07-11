# CoShop implementation status

Updated 11 July 2026. This is the evidence ledger for the production-readiness plan; it does not replace `phase-1-plan.md`.

## Shipped in this implementation

- Empty, editable first-run list with action-led onboarding and no fabricated budget or purchases.
- Exact free-text capture, catalog suggestions, progressive optional details, durable session draft, learned category corrections, real shopping progress, and reduced row action density.
- IndexedDB state and Blob media stores, one-time localStorage migration, stable identifiers, export, persisted trash, and undo for item, bulk, and list removal.
- Locale-aware money, optional budgets, and explicit coverage whenever prices are missing.
- Installable offline PWA, responsive/zoomable UI, desktop/mobile browser tests, offline restart test, and serious/critical Axe gate.
- Supabase email-link authentication, guest-first account prompt, household bootstrap/invites, Realtime changes, idempotent timestamp reconciliation, offline retry, private remote photos, and RLS isolation.
- List-scoped, expiring single-use invitations with viewer/editor roles, native mobile sharing,
  copy/SMS/WhatsApp/Telegram fallbacks, secure join previews, and feature-flagged phone/WhatsApp OTP UI.
- One consolidated list-sharing entry point and a separate settings surface for region, language,
  currency, account/backup, sync, export, and privacy controls.
- Localized English, French, German, and Spanish shopping, settings, account, list-management,
  invitation, category, date, number, and money experiences. United Kingdom, France, Germany, and
  Spain presets apply GBP/EUR and the expected language while keeping every choice editable.
- Versioned database migrations, generated client types, private Storage policy, security/performance advisor pass review, and executable cross-household RLS test.
- GitHub CI, zero known npm audit vulnerabilities, Vercel security headers, error recovery boundary, privacy notice, and incident/rollback runbook.

## Evidence

- `npm run check`: TypeScript, unit tests, production build, PWA generation, and production audit pass.
- `npm run test:e2e`: 16 guest-value, localization, accessibility, offline-restart, and deployment-mode checks pass on desktop and mobile Chromium.
- `npm run cap:sync`: Capacitor 8 web sync passes.
- `supabase/tests/rls.sql`: connected project returned only the acting household and raised no isolation failure.
- Supabase security advisor: administrative anonymous grants are removed. The remaining anonymous
  warning is the intentionally public, token-gated invitation preview; signed-in warnings are the
  authenticated bootstrap/invitation and RLS helper functions exercised by the isolation suite.
- Production smoke suite passes at <https://coshop.vercel.app> with Supabase client configuration present.

## Open production gates

These are not represented as complete:

- Owner transfer, invite revocation, household leave/delete, and self-service cloud-account deletion UI.
- SMS provider selection, fraud/cost controls, sender registration, and production activation of
  phone/WhatsApp OTP; phone authentication remains off until these operational controls exist.
- Automated 30-day tombstone/media purge job and restore UI beyond the local undo window.
- Multi-device conflict/failure soak testing with two real authenticated accounts and network fault injection.
- A selected error/analytics provider, operational dashboards, alert routing, and formal staging/alpha exit evidence.
- Native iOS/Android projects, store signing, and device permission testing; only the Capacitor web target is currently present.
- Stage E recipes/meal planning and Stage F OCR/location/retailer intelligence. The plan intentionally requires evidence and provider/legal decisions before those stages ship.

The current release is therefore a deployed production-candidate guest application with an integrated collaborative backend, not yet a general-availability collaborative beta.
