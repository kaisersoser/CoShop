# CoShop Design Sync Notes

## Repo shape

- Vite PWA application (not a published component library).
- No `module`/`main`/`exports` in package.json → synth-entry mode (converter scans `src/` for PascalCase named exports).
- No separate library dist — `dist/` is a minified Vite app bundle; do NOT pass `--entry` to package-build.mjs.
- `node_modules` lives at repo root: `d:\User\Projects\CoShop-glm\node_modules`.
- tsconfig uses `moduleResolution: "bundler"` (Vite-specific, ok for esbuild) and `"noEmit": true` (no tsc .d.ts output — ts-morph reads sources directly, which is fine).

## Components

Exported named components in `src/components/`:
- `ShoppingList` — groups items by store, two sections (Pending / Purchased). Reads from Zustand store (`useShopStore`).
- `CostFooter` — floating budget bar with in-cart total, estimated total, remaining. Reads store.
- `ItemRow` — single list row with checkbox, photo and edit actions. Reads store; opens modals via `createPortal`.

Zustand store (`src/store/store.ts`) is a module-level singleton — no Provider wrapper needed. Auto-seedes with 5 sample items on first render (in-memory if localStorage is empty in preview context).

## Font

Inter loaded from Google Fonts at runtime (`@import url(...)` in `index.css`). Configured as `runtimeFontPrefixes: ["Inter"]` so `[FONT_MISSING]` is suppressed.

## Preview considerations

- `ShoppingList` and `CostFooter` pull live data from the Zustand store, which seeds itself — previews should render with real data without any setup.
- `ItemRow` requires a `ShoppingItem` prop; pass a realistic item object in the preview.
- `ItemRow` modals (`PhotoModal`, `EditModal`) use `createPortal` to `document.body` — open states need `cardMode: "single"` override if you want to show a modal open.

## Re-sync command

```
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules node_modules --entry src/design-lib.ts --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

`--entry src/design-lib.ts` is REQUIRED — without it PKG_DIR defaults to `node_modules/coshop` (doesn't exist). The entry file makes the walker find the repo root package.json.

On a fresh clone: re-copy scripts (`cp -r <skill-base-dir>/... .ds-sync/`), reinstall deps (`cd .ds-sync && npm i esbuild ts-morph @types/react playwright`), then `npx playwright install chromium`.

## guidelinesGlob

`cfg.guidelinesGlob` is set to `["docs/design/**/*.md"]` so the converter does NOT
sweep internal docs (e.g. `docs/phase-1-plan.md`) into the design system as "usage
guidance." Author real design guidelines under `docs/design/` if/when wanted. The
default glob (`docs/*.md`, `guides/**`) would pull in implementation plans — don't revert.

## Phase 1 reshape (2026) — re-sync needed

The catalog-driven multi-list rework changed the synced components' contracts, so
the uploaded design system is now STALE. Re-run the sync (command above) to refresh:
- `ShoppingItem` lost `store`, gained required `category` and made `price` optional.
- `ShoppingList` now groups by **category** (not store); `StoreGroup` → `CategoryGroup`.
- `CostFooter` reads the active list's optional budget and treats missing price as 0.
- Store is now multi-list (`itemsByList`, `activeListId`); components read the ACTIVE list.
- `.design-sync/previews/ItemRow.tsx` already updated to the new item shape (category, optional price).
  `ShoppingList`/`CostFooter` previews are store-driven and need no prop changes.

## Re-sync risks

- Store `seedItems()` generates IDs and dates from `Date.now()` — this is fine for previews but means item IDs change every cold render. Not a problem for static preview cards.
- If the Zustand store API changes (field names, selectors), previews that access the store will need to be re-checked.
- Google Fonts runtime: previews will fall back to system-ui in headless chromium (no internet). Font rendering will differ from production; still passes the rubric if structure/tokens are correct.
