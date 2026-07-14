# CoShop design conventions

CoShop is a focused, dark-mode shopping PWA. Its interface is built from one quiet reading column,
semantic surfaces, strong typography, and restrained cyan emphasis. Avoid gradients, glow,
backdrop blur, ambient decoration, and card-per-section layouts.

## Components

`ShoppingList`, `CostFooter`, and `ItemRow` are exported from `src/design-lib.ts`. They use the
Zustand store directly and preserve the existing component signatures.

- `ShoppingList` groups items by aisle with headings, whitespace, and row dividers.
- `ItemRow` prioritizes check-off and item content; secondary actions live in its overflow menu.
- `CostFooter` is a compact honest-total summary. The application composes positioning and the Add
  item action around it.

## Semantic tokens

Use tokens from `src/index.css`; do not introduce arbitrary visual values in local components.

| Role | Token |
| --- | --- |
| Canvas | `--background` |
| Standard surface | `--surface` |
| Menus/dialogs | `--surface-raised` |
| Recessed controls | `--surface-subtle` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` |
| Structure | `--border-subtle`, `--border-strong` |
| Brand/action | `--accent`, `--accent-hover`, `--accent-soft` |
| Feedback | `--success`, `--warning`, `--danger` and their soft variants |

The cyan accent is reserved for primary actions, current state, real progress, and focus. Missing
prices, warnings, and destructive consequences must also be explained in text.

## Shared classes

| Class | Purpose |
| --- | --- |
| `.surface` | Meaningfully grouped standard surface |
| `.surface-raised` | Menus, invitations, and other truly elevated content |
| `.btn-primary` | One primary action per context |
| `.btn-secondary` / `.btn-ghost` | Lower-emphasis actions |
| `.icon-btn` | 44px accessible icon-only control |
| `.field` | Shared input/select treatment |
| `.status-badge` | Compact state or access label only |

## Layout and behavior

- Use 16px mobile, 24px tablet, and 32px desktop gutters with `--max-w: 760px`.
- Group content through alignment, spacing, type, and dividers before adding a surface or border.
- Keep every interactive target at least 44px high and retain visible keyboard focus.
- Use the shared `Dialog` primitive for modal work. Mobile uses sheets; desktop uses bounded
  dialogs. Dialogs must trap and restore focus and remain scrollable.
- Motion is limited to 120–180ms opacity/translation and respects reduced motion.
- Use sentence case and shopper-oriented labels such as “Still needed” and “In cart.”
