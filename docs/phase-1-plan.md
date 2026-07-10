# CoShop — Production Readiness Implementation Plan

## Document status

- **Status:** Approved for implementation planning
- **Supersedes:** The original Phase 1 foundation plan
- **Current product state:** Phase 1 prototype foundation implemented
- **Primary objective:** Move CoShop from a local prototype to a trustworthy, production-ready,
  local-first collaborative shopping application
- **Architecture decision:** Supabase provides Postgres, Auth, Realtime, Storage, and Row-Level
  Security behind provider-independent application interfaces
- **Identity decision:** Anonymous local use remains fully functional. Account creation is offered
  only when a user requests sharing, backup, or multi-device access.

This is the master implementation plan. It preserves the useful work completed in the original
Phase 1 while reordering future work around durability, recovery, collaboration, accessibility,
security, and operational readiness. Voice, OCR, GPS, recipes, and retailer intelligence remain
important, but they do not precede a dependable shared-list core.

---

## 1. Product objective and success criteria

CoShop should be the fastest and most trustworthy way for a household to move from “we need
something” to a completed shop. It must feel instant when offline, synchronize predictably when
online, recover safely from mistakes, and never require an account before delivering value.

### Production success criteria

- A local guest can create and complete lists indefinitely without registering.
- A guest can create an account later without losing local IDs, lists, items, photos, or settings.
- Two household members see an online list mutation within one second at p95.
- Offline mutations are durable across refreshes, app termination, and device reconnection.
- Retried mutations are idempotent and never create duplicate records.
- A failed migration leaves the legacy data readable and recoverable.
- Destructive list and item actions are reversible for a documented retention window.
- The primary add-item flow takes less than three seconds for a known item in usability testing.
- Categorization correction rate is below 5% for supported locales.
- Crash-free sessions exceed 99.5%; sync and migration failures are observable.
- Core flows pass automated accessibility checks and manual keyboard/screen-reader testing.
- Web, installable PWA, iOS, and Android share the same domain and data-layer behavior.

### Product principles

1. **Local first, not local only.** Every normal action succeeds locally before network work.
2. **Value before identity.** Signup is a protection/sharing upgrade, never an entry gate.
3. **No silent data loss.** Migrations, conflicts, storage failures, and deletes are visible and
   recoverable.
4. **Fast capture over clever capture.** Manual and recent-item entry must be excellent before AI.
5. **Calm collaboration.** Realtime updates are clear without noisy presence or notifications.
6. **Progressive disclosure.** Price, category, store, notes, and photos remain optional.
7. **Accessible by default.** Keyboard, screen reader, zoom, reduced motion, contrast, and generous
   touch targets are release requirements.
8. **Ethical engagement.** Use the rules in `docs/ux-psychology-best-practices.md`; do not create
   artificial urgency, fake progress, or coercive signup prompts.

---

## 2. Current implementation baseline

The following prototype capabilities are implemented and should be preserved through migration:

- React 18 + TypeScript + Vite PWA frontend.
- Zustand state with browser persistence.
- Multiple named lists with rename, duplicate, delete, switching, budget, and store tag.
- Catalog autocomplete with 147 starter products and deterministic category resolution.
- Category-grouped pending and purchased items.
- Optional unit price, quantity, estimated total, in-cart total, and remaining budget.
- Optional item photos.
- Dismissible onboarding.
- Web camera, geolocation, and speech capability interfaces.
- Capacitor configuration for future iOS and Android shells.

### Known production gaps

- Product copy promises collaboration but there is no account, household, backup, or sync layer.
- State and base64 photos are serialized into synchronous `localStorage`.
- PWA manifest icon files are referenced but missing.
- The migration plan says `coshop-store-v2`, while the implementation uses the stable
  `coshop-store-v1` key with internal version 2.
- Destructive actions have no undo, trash, or recovery.
- Seed data conflicts with first-item onboarding.
- Currency and default list names are hardcoded for US English.
- Modals and autocomplete do not yet implement complete accessible focus/ARIA behavior.
- External Inter font requests weaken the offline guarantee.
- No automated unit, component, end-to-end, migration, sync, or accessibility test suite exists.
- Development tooling has known audit findings and several dependencies are major versions behind.

---

## 3. Target architecture

### 3.1 Layer boundaries

UI components must not call IndexedDB, Supabase, browser APIs, or native plugins directly.

```text
React screens and components
        ↓
Application services / use cases
        ↓
Domain models + repository interfaces
        ↓
Local repositories (IndexedDB) ── Sync engine / outbox ── Remote repositories (Supabase)
        ↓                                                 ↓
Blob/image service                                  Postgres + Storage + Realtime
        ↓
Web or Capacitor capability adapters
```

Create these source boundaries:

```text
src/domain/                 Stable domain entities, commands, validation, totals
src/application/            Use cases: addItem, shareList, importGuestData, undo, sync
src/data/local/             IndexedDB schema, migrations, local repositories
src/data/remote/            Supabase repositories and DTO mapping
src/data/sync/              Outbox, pull cursor, retry, conflict and connectivity logic
src/services/auth/          Guest/account session orchestration
src/services/media/         Compression, thumbnailing, upload/download lifecycle
src/services/telemetry/     Provider-neutral errors, traces, metrics, product events
src/lib/capabilities/       Camera, speech, geolocation, wake lock, share adapters
src/store/                  Thin UI/view state; no longer the durable system of record
src/components/             Presentational and interaction components
src/features/               Feature-level screens, hooks, and composition
```

Zustand remains appropriate for transient view state and reactive projections. Durable mutations
must go through application services and repositories rather than writing the Zustand snapshot.

### 3.2 Local data store

Use IndexedDB through a small typed adapter. The implementation may use `idb` or Dexie, but domain
code depends only on repository interfaces.

Required object stores:

- `meta`: schema version, migration state, device ID, pull cursor, successful-start count.
- `households`: local workspace and synchronized household metadata.
- `members`: cached household membership and roles.
- `lists`: named lists, store, budget, ownership, revisions, deletion state.
- `items`: list items, category, quantity, pricing, status, position, revisions, deletion state.
- `stores`: store metadata and household-specific store configuration.
- `categoryOrders`: default and per-store category/aisle ordering.
- `attachments`: local blob, thumbnail, media type, upload state, remote path.
- `outbox`: durable ordered mutations waiting for remote acknowledgement.
- `syncState`: per-household cursors, last success, last error, and retry metadata.
- `undoLog`: reversible local commands with expiry and inverse payload.
- `catalogOverrides`: household aliases, corrections, recent and frequent-item statistics.

All local write operations that affect sync must update the entity and append its outbox mutation in
one IndexedDB transaction.

### 3.3 Domain identifiers and time

- Generate UUIDs on the client so guest records retain their IDs after account creation.
- Generate a stable random `deviceId` during local database initialization.
- Store timestamps as UTC ISO strings at persistence boundaries.
- Use server time for canonical remote `created_at` and `updated_at` values.
- Use monotonically increasing server `version` values for reconciliation.
- Never use array position as identity; list ordering uses a stable sortable `position` value.

### 3.4 Remote Supabase schema

Initial tables:

- `profiles(id, display_name, locale, currency, created_at, updated_at)`
- `households(id, name, created_by, created_at, updated_at, deleted_at)`
- `household_members(household_id, user_id, role, joined_at, removed_at)`
- `household_invites(id, household_id, token_hash, role, expires_at, created_by, used_at)`
- `lists(id, household_id, name, budget_minor, currency, store_id, position, version,
  created_by, created_at, updated_at, deleted_at)`
- `items(id, household_id, list_id, name, catalog_id, category_id, quantity, unit, price_minor,
  currency, is_purchased, position, notes, version, created_by, updated_by, created_at,
  updated_at, deleted_at)`
- `stores(id, household_id, name, address, latitude, longitude, created_at, updated_at, deleted_at)`
- `store_category_orders(id, household_id, store_id, category_id, position, updated_at)`
- `attachments(id, household_id, list_id, item_id, storage_path, mime_type, width, height,
  byte_size, version, created_by, created_at, deleted_at)`
- `mutation_receipts(id, household_id, client_mutation_id, user_id, device_id, entity_type,
  entity_id, applied_version, created_at)`

Implementation requirements:

- Monetary values are integer minor units plus ISO 4217 currency, never floating-point database
  values.
- Quantities support count now and allow future `unit` values without a breaking migration.
- Soft deletion is the default. Hard deletion runs only after the retention period.
- Every synchronized entity belongs to one household for simple and auditable authorization.
- Foreign keys, uniqueness constraints, useful indexes, and updated-at triggers are defined in SQL
  migrations committed to `supabase/migrations/`.
- Generated Supabase TypeScript types are committed and checked for drift in CI.

### 3.5 Authorization and RLS

- Guests have no remote records and no Supabase credentials.
- Authenticated members may select records only for active household memberships.
- `owner` can manage the household, invites, roles, and deletion.
- `editor` can manage lists, items, stores, and attachments but not roles or household deletion.
- A future `viewer` role is read-only; it need not be exposed in the first UI.
- Invite tokens are random, single-use, time-limited, stored only as hashes, and redeemed through a
  server-side function.
- Storage paths use `householdId/listId/itemId/attachmentId`; matching Storage RLS verifies active
  membership.
- The Supabase service-role key is never shipped to a client.
- Automated SQL tests must prove cross-household reads and writes fail.

### 3.6 Sync protocol

Each local command creates an outbox operation:

```ts
interface OutboxOperation {
  id: string;                 // clientMutationId; idempotency key
  householdId: string;
  deviceId: string;
  entityType: 'list' | 'item' | 'store' | 'attachment' | 'categoryOrder';
  entityId: string;
  kind: 'create' | 'patch' | 'delete' | 'restore';
  patch: Record<string, unknown>;
  baseVersion?: number;
  createdAt: string;
  attemptCount: number;
  nextAttemptAt?: string;
}
```

Rules:

1. Apply mutations locally and enqueue atomically.
2. Send operations in device order, in bounded batches.
3. Supabase RPCs check `mutation_receipts` before applying an operation.
4. Creates use client IDs and are safe to retry.
5. Patches update only fields explicitly included in the operation.
6. The server increments `version` and returns the canonical record.
7. Different-field concurrent edits merge naturally; same-field edits use last accepted server
   write and remain visible in the local undo/activity history.
8. Deletes create tombstones. Later stale patches cannot resurrect a deleted entity.
9. An explicit restore is a versioned operation and is allowed only during retention.
10. Realtime events accelerate pull but are never treated as the sole source of truth.
11. On reconnect or app resume, pull all records after the household cursor, reconcile, then flush.
12. Retry transient failures with exponential backoff and jitter; stop retrying authorization and
    validation failures until the user or application resolves them.
13. Surface `Saved locally`, `Syncing`, `Synced`, and `Needs attention` states without blocking
    list use.

No CRDT is planned initially. Revisit only if production telemetry shows unacceptable concurrent
same-field conflicts or rich collaborative text becomes a requirement.

### 3.7 Guest-to-account migration

1. Continue storing guest data only in IndexedDB.
2. Trigger account creation from `Share`, `Back up`, or `Use on another device`.
3. After authentication, create a household and membership remotely.
4. Snapshot local counts and IDs before import.
5. Upload local entities in dependency order using idempotent operations.
6. Upload compressed attachments after their item metadata is acknowledged.
7. Pull the canonical household and verify entity counts/IDs.
8. Mark the local workspace as linked only after verification succeeds.
9. On interruption, resume from mutation receipts; never duplicate or discard local records.
10. Offer a human-readable recovery action if a record cannot be imported.

---

## 4. Delivery stages and dependency order

Each stage has an exit gate. Work from a later stage may be prototyped behind a disabled flag, but
it cannot ship before all earlier gates pass.

## Stage A — Baseline, safety, and delivery pipeline

**Goal:** Make the current prototype measurable, testable, installable, and safe to change.

### A1. Repository and environments

- Initialize/confirm source control and establish protected `main` plus short-lived branches.
- Add `.env.example` with public Supabase variables only.
- Define local, preview/staging, and production environments with separate Supabase projects.
- Add documented setup, build, test, migration, rollback, and release commands.
- Add feature flags for sync, accounts, voice, OCR, GPS, recipes, and retailer integrations.
- Add a production `README.md` and architecture decision records under `docs/adr/`.

### A2. CI and dependency baseline

- Add ESLint, Prettier, Vitest, React Testing Library, Playwright, axe, and bundle-size checks.
- CI gates: install with lockfile, typecheck, lint, unit/component tests, production build,
  end-to-end smoke test, dependency audit, SQL/RLS tests, and generated-type drift.
- Upgrade Vite and `vite-plugin-pwa` to supported versions and clear known tooling audit findings.
- Upgrade other major dependencies one at a time with tests; do not combine framework and storage
  migrations in one change.
- Add Dependabot or Renovate with grouped patch/minor updates and manual major-version review.

### A3. PWA and offline shell

- Add real 192, 512, maskable, and Apple touch icons.
- Add manifest `id`, screenshots, shortcuts, and consistent theme/background colors.
- Bundle Inter locally and remove duplicate Google Fonts requests.
- Add install guidance and update-ready UI; do not reload while a composer or edit is active.
- Add explicit offline/online indicators only when they change available behavior.
- Test clean install, upgrade, offline cold start, and uninstall/reinstall on supported browsers.

### A4. Immediate UX and accessibility defects

- Remove `user-scalable=no` and maximum-scale restrictions.
- Introduce a reusable accessible `Dialog` with focus trap, initial focus, Escape, inert background,
  focus restoration, scroll lock, title, and description wiring.
- Replace existing composer, list manager, edit, and photo modals with the shared dialog primitives.
- Implement a compliant combobox with `aria-controls`, `aria-activedescendant`, Home/End, Escape,
  selection announcement, and a distinct “Add exactly …” option.
- Add global `:focus-visible` styling and 44×44 preferred primary touch targets.
- Associate all labels and inputs; validate at 200% text zoom and narrow mobile widths.
- Replace prototype seeds with an explicit `Load demo list` action in development/demo mode.
- Preserve an empty first-run list and align onboarding with the actual state.

### Stage A exit gate

- CI passes from a clean checkout.
- Production build and PWA installation pass on the supported browser matrix.
- No high-severity production or build-tool audit findings remain without an approved exception.
- Core flows have automated accessibility checks and pass manual keyboard navigation.
- Existing Phase 1 behavior has regression coverage.

## Stage B — Durable local-first foundation

**Goal:** Replace the fragile snapshot store without changing the essential user experience.

### B1. Extract domain and repository interfaces

- Move entity types out of `src/store/store.ts` into `src/domain/`.
- Add runtime validation at storage and network boundaries.
- Move totals, item resolution, and invariants into tested domain functions.
- Define `ListRepository`, `ItemRepository`, `StoreRepository`, `AttachmentRepository`,
  `SettingsRepository`, and `UnitOfWork` interfaces.
- Keep Zustand as a reactive UI cache backed by repository subscriptions/queries.

### B2. IndexedDB schema and migration

- Implement versioned local database creation and transactional repositories.
- Write a fixture-based legacy reader for every known `coshop-store-v1` payload version.
- On first migration, copy legacy data into IndexedDB without mutating the legacy key.
- Validate record counts, IDs, list-item relationships, prices, categories, photos, and onboarding.
- Store a migration receipt and checksum after successful verification.
- Keep the original localStorage payload as a recovery source until two successful app startups;
  remove it only after a tested cleanup step.
- If migration fails, remain in read-only recovery mode with export/retry—not a blank app.
- Resolve the documentation/key contradiction by treating `coshop-store-v1` as legacy input and
  the IndexedDB schema version as the sole new migration version.

### B3. Media lifecycle

- Validate type and dimensions before decoding.
- Resize images off the main thread where supported.
- Strip unnecessary metadata, generate a thumbnail, and target a configurable size budget.
- Store blobs and thumbnails in IndexedDB, not base64 in list records.
- Gracefully handle quota exhaustion and allow removing large attachments.
- Abstract remote upload state for Stage C.

### B4. Undo, trash, export, and recovery

- Add undo snackbars for item deletion, clear purchased, status changes where appropriate, and
  category corrections.
- Require a concrete-stakes confirmation for deleting a populated list.
- Soft-delete lists/items locally and expose a short-lived trash/recently-deleted view.
- Add JSON export/import with schema version, validation, preview, and collision handling.
- Add a diagnostics screen showing storage use, last migration, app version, and recovery actions.

### B5. Locale-safe money and quantities

- Add locale and currency settings with device-locale defaults.
- Store money as integer minor units in new domain entities.
- Convert legacy floats deterministically during migration.
- Render using `Intl.NumberFormat`.
- Distinguish estimated and actual price and disclose incomplete estimates.
- Introduce an optional unit field without requiring it in the UI.

### Stage B exit gate

- Legacy fixtures migrate without data loss and can be rolled back/retried.
- Refresh, termination, quota error, and offline tests preserve acknowledged local work.
- Photos no longer appear in localStorage or entity JSON.
- Export/import round trips all supported guest data.
- All durable writes are repository transactions; Zustand/localStorage is not the source of truth.

## Stage C — Accounts, backup, and household collaboration

**Goal:** Fulfill the collaborative product promise while preserving anonymous local use.

### C1. Supabase project and schema

- Create local/staging/production Supabase projects.
- Commit SQL migrations for the schema, indexes, triggers, functions, retention jobs, and RLS.
- Seed only catalog/taxonomy reference data; never seed production user data.
- Generate typed clients and map Supabase DTOs at the data boundary.
- Add local Supabase development and reset commands.

### C2. Authentication and account linking

- Support email magic link initially; add Apple and Google only after redirect and account-linking
  behavior is tested across PWA and Capacitor.
- Preserve full guest use without auth prompts during normal list creation or shopping.
- Offer account creation contextually for backup, sharing, and multi-device access.
- Implement session expiry, refresh, sign-out, offline session, and account switching states.
- Prevent accidental orphaning when a user signs out with unsynced operations.

### C3. Guest import and cloud backup

- Implement the verified, resumable guest-to-account migration described above.
- Display progress based on real imported records, not artificial completion.
- Keep local data available while upload occurs.
- Add explicit last backup/sync state and retry controls.
- Test interruption at every import stage and across multiple sign-in attempts.

### C4. Household and invitation flows

- Create a household automatically for the first linked account.
- Add `Share list/household` via secure universal link and QR code.
- Show inviter, household name, role, expiry, and concrete data scope before acceptance.
- Support pending, expired, used, revoked, and already-member states.
- Add member management, ownership transfer, leave household, and household deletion flows.
- Delay per-list sharing unless research shows household-wide sharing is insufficient; keep schema
  extensible for it.

### C5. Sync and realtime

- Implement transactional outbox, idempotent mutation RPCs, pull cursor, reconciliation, retry,
  and tombstones.
- Subscribe to Realtime for active households and active lists.
- Coalesce rapid operations and reconnect cleanly after backgrounding.
- Show who added or last changed an item without adding noisy live cursors.
- Add a small sync diagnostics surface and redact sensitive payloads from logs.
- Test two devices editing online, one offline, both offline, account removal, expired session,
  revoked membership, clock skew, duplicate delivery, reordered delivery, and long disconnects.

### C6. Remote attachments

- Upload compressed originals and thumbnails to Supabase Storage after item acknowledgement.
- Use signed or authenticated URLs; do not expose public buckets.
- Deduplicate retries by attachment ID/path.
- Cache thumbnails locally and clean remote objects after tombstone retention expires.
- Display recoverable states for local-only, uploading, uploaded, failed, and unavailable media.

### Stage C exit gate

- Cross-household RLS tests prove isolation for every table and Storage path.
- Guest import is idempotent and survives forced interruption.
- Two-device online updates meet the p95 latency target.
- Offline operations sync exactly once after reconnect in fault-injection tests.
- Delete/restore semantics are deterministic across devices.
- Account deletion, household deletion, export, and retention behavior are documented and tested.
- Collaboration can be disabled remotely without breaking local list use.

## Stage D — Best-in-class capture and shopping mode

**Goal:** Make daily planning and in-store execution noticeably faster than a generic list app.

### D1. Quick capture

- Add an always-available quick-add field with advanced details progressively disclosed.
- Keep the existing sheet for price, quantity, unit, category, note, photo, and store assignment.
- Support comma/newline bulk input and paste parsing.
- Add recent, frequent, favorite, and household-specific suggestions.
- Merge likely duplicates or offer increment/separate choices; never merge silently at low
  confidence.
- Preserve composer drafts across accidental close, update, and backgrounding.
- Add native/system share actions and deep links into a target list.

### D2. Catalog and learned household behavior

- Version the bundled catalog and support locale-specific catalog packs.
- Store household aliases and category corrections locally and remotely.
- Rank exact household history above generic catalog matches.
- Record correction metrics without retaining raw sensitive text in analytics.
- Add custom categories while preserving stable built-in category IDs.

### D3. Shopping mode

- Add an explicit mode optimized for one-handed use and minimal screen density.
- Keep pending items prominent and collapse purchased groups by default.
- Show real progress, remaining count, incomplete-price disclosure, and budget context.
- Add optional Wake Lock through the capability layer.
- Support fast quantity change, undo purchase, and accessible row actions.
- Add a user preference for purchase behavior and purchased-item placement.

### D4. Store-specific aisle ordering

- Allow households to reorder categories for each store.
- Remember the order and apply it automatically when that store is selected.
- Offer drag-and-drop plus keyboard-accessible move controls.
- Model but defer fine-grained individual item aisle positions until usage validates the need.

### D5. Voice capture

- Add a complete speech capability contract with permission, partial, final, cancel, and error
  states.
- Use native speech plugins in Capacitor where Web Speech is unavailable.
- Parse multiple spoken items into an editable review screen.
- Show the recognized result before saving and never block manual editing.
- Document on-device/cloud processing and request permission only at the moment of use.

### Stage D exit gate

- Median known-item capture time is below three seconds in usability tests.
- Shopping mode is usable one-handed and passes keyboard/screen-reader alternatives.
- Aisle order persists and synchronizes per household/store.
- Voice failures always return the user to an editable manual flow.
- Correction and duplicate-merge metrics meet agreed thresholds before default enablement.

## Stage E — Recipes, meal planning, and recurring household needs

**Goal:** Increase weekly utility after the shared shopping loop is dependable.

- Add list templates, favorites, “repeat last shop,” and recurring staples first.
- Add recipe entities, ingredients, servings, collections, and household sharing.
- Import recipes from supported web metadata with source attribution.
- Normalize ingredients and let users preview merges before adding to a list.
- Add a meal calendar and generate a list for a selected date range.
- Preserve manual list edits when meal plans change.
- Keep cooking mode and external calendar sync as separate, validated increments.

### Stage E exit gate

- Generated lists never silently remove or overwrite manual items.
- Ingredient scaling and merging have fixture-based tests.
- Source attribution and import failure states are clear.
- Product telemetry demonstrates recurring/template demand before expanding to full meal planning.

## Stage F — OCR, location, and retailer intelligence

**Goal:** Add advanced assistance only when accuracy, privacy, source quality, and operating cost
are understood.

### F1. OCR

- Define separate receipt, printed-list, screenshot, barcode, and handwriting use cases.
- Benchmark on-device and cloud providers against a representative consented test set.
- Route results to an editable review screen with confidence and original-image reference.
- Set cost, latency, privacy, and accuracy gates before selecting a provider.

### F2. Location and store detection

- Request coarse location only from a user-initiated “Detect store” action.
- Distinguish detected suggestion from confirmed store.
- Cache reverse-geocoding responsibly and allow manual store selection at all times.
- Do not run continuous background location for the initial feature.

### F3. Retail and pricing

- Record price source, observed date, region, package size, and currency.
- Never present stale or incomparable prices as a definitive saving.
- Validate retailer API licenses, attribution, geographic coverage, and update frequency.
- Keep offers, loyalty cards, and price comparison behind separate feature flags.
- Complete privacy and legal review before ingesting receipts or loyalty identifiers.

### Stage F exit gate

- OCR meets documented accuracy, latency, privacy, and cost thresholds on representative data.
- Every automated capture result is editable before it mutates a shopping list.
- Location permission is contextual, optional, and unnecessary for manual store selection.
- Retail prices expose source, observation date, region, package basis, and currency.
- Privacy, security, legal, and provider-failure reviews are complete for every enabled integration.
- Each intelligence feature can be disabled independently without impairing core list operation.

---

## 5. Cross-cutting implementation requirements

### 5.1 Testing strategy

**Unit tests**

- Catalog normalization, ranking, singular/plural behavior, and thresholds.
- Money conversion, totals, quantities, category order, and domain validation.
- Every local database migration and rollback/retry path.
- Outbox coalescing, retry scheduling, conflict rules, and tombstone behavior.

**Component tests**

- Quick add and autocomplete keyboard/screen-reader behavior.
- Dialog focus lifecycle.
- Item editing, category correction, deletion/undo, budget, and list switching.
- Sync and media status rendering.

**Integration tests**

- IndexedDB transaction atomicity and quota/error handling.
- Supabase repositories against a local project.
- RLS matrix by household role.
- Guest import, attachment upload, token redemption, and account lifecycle.

**End-to-end tests**

- First launch and empty onboarding.
- Legacy migration.
- Offline create/edit/delete followed by reconnect.
- Two-browser collaboration and conflict scenarios.
- PWA update while a draft is open.
- Export/import and account deletion.
- Capacitor smoke tests when native projects are introduced.

### 5.2 Observability

- Add provider-neutral structured logging with environment, release, device/app platform, and
  correlation IDs.
- Capture unhandled errors and rejected promises with source maps in staging/production.
- Trace migration, guest import, sync batch, Realtime reconnect, and attachment upload durations.
- Metrics: migration success, outbox depth/age, sync latency, retry rate, conflict rate, quota
  errors, attachment failures, and crash-free sessions.
- Product events: first item, first completed list, share initiated/completed, repeat-item use,
  shopping-mode completion, and categorization correction.
- Never log list names, item names, notes, photos, invite tokens, precise location, or auth secrets.
- Add alert thresholds and a runbook for migration spikes, sync backlog, auth failure, and RLS
  regressions.

### 5.3 Security and privacy

- Maintain a lightweight threat model for guest data, account linking, invitations, sync, media,
  and Supabase configuration.
- Add Content Security Policy and security headers appropriate to PWA hosting.
- Sanitize/validate imported JSON and recipe content at trust boundaries.
- Rate-limit invitation redemption, mutation endpoints, and expensive media operations.
- Use short-lived signed media access where needed.
- Provide privacy notice, export, account deletion, and documented retention before public launch.
- Minimize data collection and keep analytics opt-out/consent behavior appropriate to launch
  regions.
- Run secret scanning and dependency review in CI.

### 5.4 Accessibility and design system

- Target WCAG 2.2 AA; prefer 44×44 controls for core mobile actions.
- Test light/dark/high-contrast behavior if additional themes are introduced.
- Support reduced motion, 200% text zoom, dynamic viewport/safe areas, and screen readers.
- Keep gesture actions optional and provide equivalent visible controls.
- Resync `ShoppingList`, `CostFooter`, and `ItemRow` design-system contracts after their production
  APIs stabilize; do not treat stale preview bundles as release evidence.

### 5.5 Performance budgets

- Define and enforce route bundle budgets; lazy-load account, diagnostics, recipe, and OCR flows.
- Keep initial catalog search responsive on low-end mobile hardware.
- Avoid synchronous serialization of complete application state.
- Virtualize only after measurement; typical grocery lists should not require it.
- Compress thumbnails and avoid decoding full-size images in list rows.
- Measure cold start, interactive time, IndexedDB open/migration time, and sync reconciliation.

---

## 6. Rollout strategy

### Environments

- **Local:** Local Supabase and fixture accounts; destructive reset allowed.
- **Staging:** Production-like RLS, Storage, Realtime, email redirects, and telemetry.
- **Production:** Separate keys, migrations, buckets, retention, backups, and alerts.

### Release rings

1. Internal development with synthetic data.
2. Internal dogfood with migration and sync diagnostics enabled.
3. Invite-only household alpha; local mode remains fallback.
4. Limited beta with remote kill switches and migration monitoring.
5. General availability after security, privacy, accessibility, reliability, and store-review gates.

### Rollback rules

- Database migrations are forward-compatible during the rollout window.
- Never deploy code that requires a destructive schema change in the same release.
- Keep remote feature flags for account creation, sharing, Realtime, attachments, voice, and OCR.
- Disabling sync must leave the local database usable and preserve the outbox.
- A failed client data migration falls back to recovery/export; it must not initialize blank state.
- Publish incident runbooks before the invite-only alpha.

---

## 7. Key product and operational metrics

### Reliability

- Crash-free sessions and users.
- Local transaction failure and storage quota rate.
- Migration and guest-import success rate.
- Outbox age, sync success, retry, duplicate, and conflict rates.
- Realtime reconnect and attachment failure rates.

### Experience

- Time to first item and median item capture time.
- Categorization correction rate.
- Duplicate-merge acceptance/reversal rate.
- Shopping-session completion rate and time.
- Accessibility defects per release.

### Product value

- Guest-to-account conversion after share/backup intent.
- Share invitation completion.
- Active collaborative households.
- Four-week household retention.
- Repeated-item/template use.
- Lists completed per active household.

Metrics are diagnostic, not permission for coercive onboarding or notification patterns.

---

## 8. Initial implementation backlog and critical path

Execute in this dependency order:

1. **Testing/CI baseline** — protects all subsequent migrations.
2. **Accessible UI primitives and PWA fixes** — removes known launch blockers independently.
3. **Domain/repository extraction** — creates the seam for durable local and remote data.
4. **IndexedDB and legacy migration** — establishes the production system of record.
5. **Media, undo, export, and recovery** — completes local data safety.
6. **Supabase schema and RLS** — establishes remote security before client collaboration.
7. **Auth and guest import** — links existing value to an account safely.
8. **Outbox/reconciliation/realtime** — fulfills collaboration.
9. **Households/invitations/remote attachments** — completes the shared-list product.
10. **Quick capture, shopping mode, aisle order, and voice** — differentiates daily execution.
11. **Templates/recurring items, recipes, and meal planning** — expands weekly planning.
12. **OCR, location, offers, and price intelligence** — proceeds only through evidence gates.

The critical path to a production collaborative beta is items 1–9. Items 10–12 must not delay the
beta unless user research identifies a missing core flow.

---

## 9. Production collaborative beta definition of done

- [ ] Clean checkout setup and CI are documented and passing.
- [ ] PWA installs with correct icons and starts offline.
- [ ] Local data uses IndexedDB; no photos or durable state are stored as base64/localStorage.
- [ ] Every known legacy fixture migrates and has a recovery path.
- [ ] Guest mode supports the complete local shopping-list experience.
- [ ] Account creation imports guest data without changing IDs or losing records.
- [ ] Supabase migrations and generated types are committed.
- [ ] RLS and Storage policies pass cross-household isolation tests.
- [ ] Household invite, accept, revoke, leave, transfer, and delete flows are tested.
- [ ] Online and offline collaboration satisfy latency and exactly-once-effect acceptance tests.
- [ ] Deletes are soft, reversible, synchronized, and later purged by documented retention.
- [ ] Export and account deletion are available.
- [ ] Core dialogs, comboboxes, lists, and actions pass accessibility validation.
- [ ] Error reporting, sync/migration metrics, dashboards, alerts, and incident runbooks exist.
- [ ] Privacy notice, retention policy, and security review are complete.
- [ ] Feature flags can disable remote features while preserving local operation.
- [ ] Staging dogfood and invite-only alpha exit criteria have been met.

---

## 10. Explicitly deferred decisions

These decisions do not block Stages A–C because their boundaries are defined:

- Error-reporting and product-analytics vendor; use provider-neutral telemetry interfaces first.
- Apple/Google login timing; email magic link is the initial authenticated path.
- Monetization and premium tiers; no production architecture should require payment to preserve
  local data ownership.
- Per-list sharing versus household-wide sharing; household sharing ships first.
- OCR provider and on-device/cloud split; benchmark in Stage F.
- Reverse-geocoding provider; manual store selection remains primary.
- Retailer, offer, loyalty, and price data partners; each requires separate legal/data-quality
  review.
- Full CRDT adoption; current command/outbox/revision model is sufficient until telemetry proves
  otherwise.

Revisit deferred decisions through a short architecture/product decision record before their stage
begins.
