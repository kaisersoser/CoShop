# CoShop

CoShop is an offline-first shopping-list application built with React, TypeScript, Vite, Zustand,
and Capacitor. The current implementation is a catalog-driven, multi-list prototype being prepared
for production-ready household collaboration.

## Current features

- Multiple named shopping lists
- Catalog autocomplete and automatic category grouping
- Optional prices, quantities, budgets, and store tags
- Item photos and offline persistence
- Installable PWA foundation
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
npm run build
```

## Roadmap

The detailed production-readiness architecture, delivery stages, acceptance gates, and rollout plan
are documented in [docs/phase-1-plan.md](docs/phase-1-plan.md).

The next critical milestones are durable IndexedDB storage, migration and recovery safeguards,
Supabase-backed accounts and household collaboration, and an offline transactional sync engine.

## Project status

CoShop is under active development and should currently be treated as a prototype, not a
production service.
