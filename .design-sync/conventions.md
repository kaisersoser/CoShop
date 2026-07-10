# CoShop — Design Conventions

CoShop is a premium dark-mode React PWA. The design language is glassmorphism + vibrant violet-to-cyan gradients on a deep near-black background. Build layouts by composing the three exported components with CSS custom-property tokens and the utility classes below.

## Wrapping and setup

No provider or context wrapper required. Components (`ShoppingList`, `CostFooter`, `ItemRow`) import a Zustand singleton that self-initialises. Render them directly:

```jsx
import { ShoppingList, CostFooter } from 'coshop';

export default function Screen() {
  return (
    <div className="app-shell">
      <ShoppingList />
      <CostFooter />
    </div>
  );
}
```

`ItemRow` requires one prop: `item` (a `ShoppingItem` object with `id`, `name`, `category`, `quantity`, `isPurchased`, `createdAt`, and optional `price`, `catalogId`, `storeIds`, `photoBase64`). `price` is optional — rows without a price show quantity only. Items whose `category` is `"other"` render an inline category picker. It is always rendered inside an `<ul>`.

## Styling idiom — CSS custom properties + utility classes

**Do not invent new class names or inline `style` for design language.** Use tokens as `var(--token)` for custom elements, and the shipped utility classes for common patterns:

| Class | Purpose |
|---|---|
| `.glass` | Translucent elevated surface (backdrop-filter blur, border, shadow) |
| `.glass-strong` | Stronger blur — headers, modals, the cost footer |
| `.btn-primary` | Gradient CTA button (violet → cyan, glow shadow) |
| `.btn-ghost` | Secondary ghost button (border, subtle fill on hover) |
| `.icon-btn` | Circular 38 px icon button |
| `.field` | Text/number input (glassmorphism fill, accent focus ring) |
| `.chip` | Small pill badge (soft gradient tint, border) |
| `.text-grad` | Applies the brand gradient as a text fill |

**Key design tokens** (all defined in `styles.css` → `_ds_bundle.css`):

```
Surfaces:  --bg-base #0b0f17   --bg-elev-1  --bg-elev-2  --bg-elev-3
Glass:     --glass-bg          --glass-bg-strong  --glass-border
Accent:    --accent-1 #7c5cff  --accent-2 #21d4fd  --accent-grad (linear-gradient 135deg)
Text:      --text-primary      --text-secondary    --text-tertiary
Semantic:  --success #34e0a1   --warning #ffb648   --danger #ff6b81
Spacing:   --sp-1 4px  --sp-2 8px  --sp-3 12px  --sp-4 16px  --sp-5 20px  --sp-6 24px  --sp-8 32px  --sp-10 40px  --sp-12 48px
Radii:     --r-sm 8px  --r-md 14px  --r-lg 20px  --r-xl 28px  --r-pill 999px
Font size: --fs-xs 0.72rem  --fs-sm 0.84rem  --fs-md 0.95rem  --fs-lg 1.1rem  --fs-xl 1.4rem  --fs-2xl 1.9rem  --fs-3xl 2.4rem
Motion:    --dur-fast 140ms  --dur-med 260ms  --ease-out  --ease-spring
Layout:    --max-w 720px  --footer-h 116px
```

## Where the truth lives

- All tokens and utilities: `_ds/<folder>/styles.css` and its `@import` chain (includes `_ds_bundle.css`)
- Per-component API and usage notes: `_ds/<folder>/components/general/<Name>/<Name>.prompt.md`

## Idiomatic build snippet

A shopping screen with the real components and the DS's class vocabulary for layout glue:

```jsx
import { ShoppingList, CostFooter } from 'coshop';

export default function ShoppingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        paddingBottom: 'calc(var(--footer-h) + var(--sp-6))',
      }}
    >
      <header className="glass-strong" style={{ padding: 'var(--sp-4) var(--sp-5)', margin: 'var(--sp-3)', borderRadius: 'var(--r-xl)' }}>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Week of Jun 22
        </h1>
      </header>
      <main style={{ padding: 'var(--sp-3)' }}>
        <ShoppingList />
      </main>
      <CostFooter />
    </div>
  );
}
```
