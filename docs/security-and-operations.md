# CoShop security and operations

## Data boundaries

- Guest state and image blobs are stored in IndexedDB; legacy localStorage is read only for one-time migration and then removed.
- Cloud data is scoped by `household_id`. Every exposed table and the private photo bucket use row-level policies.
- Only publishable Supabase credentials may reach the browser. Service-role keys must never be used by Vite or Vercel client variables.
- Content Security Policy limits script, network, framing, and object sources. Camera access is same-origin and microphone/location are disabled until their features exist.
- List invitation tokens are random, stored only as SHA-256 hashes, single use, revocable, and
  expire after seven days. Preview responses expose list name and requested role, never item data.
- Phone OTP stays disabled until provider credentials, sender registration, geographic controls,
  rate limits, delivery monitoring, and abuse alerts are configured outside the client.
- PDF invoices are parsed locally and are neither stored nor uploaded. AI enrichment is explicit,
  authenticated, limited to product names/EANs/retailer departments, schema-constrained, capped at
  100 rows and five requests per ten minutes per warm function instance, and configured with
  `store: false`. Customer, address, order, payment, price, and quantity data are excluded.
- `OPENAI_API_KEY` is server-only and must never use the `VITE_` prefix. Rotate it immediately if it
  appears in a client bundle, log, commit, support message, or screenshot.

## Incident runbook

1. Disable cloud features by removing the two `VITE_SUPABASE_*` deployment variables; guest mode remains operational. Remove `OPENAI_API_KEY` separately to disable AI enrichment while preserving local PDF import.
2. Preserve database and Auth logs, note the UTC detection time, affected household IDs, and release SHA. Do not copy list contents into tickets.
3. Revoke affected sessions or publishable keys in Supabase when credential misuse is suspected.
4. Apply schema changes through a new numbered migration. Run security/performance advisors and the RLS isolation test before restoring cloud features.
5. Communicate confirmed scope, mitigation, recovery steps, and follow-up. Never claim data loss or safety before verification.

## Recovery and rollback

- Vercel rollback restores the previous static client. IndexedDB migrations retain a stable v3 key and legacy data is not deleted until the new record is written.
- Item, bulk-purchased, and list removal enter local trash with undo. Remote deletions are tombstones and the documented purge target is 30 days.
- Users can export current list data as JSON from Backup & share.

## Release checks

Run `npm run check`, `npm run test:e2e`, `npm run cap:sync`, Supabase security/performance advisors, and `supabase/tests/rls.sql`. A release is blocked by production dependency vulnerabilities, serious/critical accessibility violations, cross-household reads, failed offline restart, or lost guest data.
