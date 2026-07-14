# CoShop

CoShop is a guest-first, offline shopping-list application built with React, TypeScript, Vite,
Zustand, Supabase, and Capacitor. The production candidate is live at
<https://coshop.vercel.app>.

## Current features

- Multiple named shopping lists
- Catalog autocomplete and automatic category grouping
- Optional prices, quantities, budgets, and store tags
- IndexedDB list persistence and Blob-backed item photos
- Undo/trash recovery and JSON export
- Optional email-link backup, household invites, Realtime sync, and private remote photos
- List-specific viewer/editor invitations through native sharing, SMS, WhatsApp, or Telegram; phone OTP is
  feature-flagged until an SMS provider is configured
- Consolidated settings with localized English, French, German, and Spanish interfaces; regional
  defaults for the United Kingdom (GBP), France (EUR), Germany (EUR), and Spain (EUR); plus
  automatic currency defaults for every displayed region, backup/sync, export, and privacy controls
- Honest budget totals with missing-price coverage and real shopping progress
- Private PDF invoice import with local Carrefour parsing, editable item review, optional historical
  prices, and authenticated AI categorization/English-French-German-Spanish translation
- Installable offline PWA with desktop/mobile accessibility tests
- Capacitor-ready platform capability abstractions

## Development

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Run the production checks:

```bash
npm run lint
npm run check
npm run test:e2e
```

## Roadmap

The detailed production-readiness architecture, delivery stages, acceptance gates, and rollout plan
are documented in [docs/phase-1-plan.md](docs/phase-1-plan.md).

Copy `.env.example` to a local ignored environment file to enable cloud features. Use only the
Supabase project URL and publishable key; never put a service-role key in a `VITE_` variable. PDF
AI enrichment also requires a server-only `OPENAI_API_KEY` in Vercel; never prefix it with `VITE_`.

Database changes live under `supabase/migrations`. Run `supabase/tests/rls.sql` against a safe test
project after policy changes.

## Project status

The deployed build is a production-candidate guest application. The exact shipped evidence and
remaining collaborative-beta gates are recorded in
[docs/implementation-status.md](docs/implementation-status.md).
