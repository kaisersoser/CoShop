# CoShop UX and visual review

## Executive assessment

CoShop is functionally thoughtful but visually over-articulated. Guest-first use, durable offline
lists, category inference, real shopping progress, price-coverage disclosure, undo, localization,
and list-scoped sharing are strong foundations worth preserving. The current Emerald Gloss theme
wraps nearly every relationship in translucent panels, borders, pills, glow, and circular icon
frames. This gives navigation, content, status, and decoration similar weight and makes a focused
shopping tool feel like a component showcase.

The five highest-impact opportunities are:

1. Replace glass and glow with a restrained, semantic dark surface system using the brand cyan.
2. Turn the shopping screen into one continuous, scan-friendly list instead of stacked cards.
3. Consolidate first use into one action-led empty state and one obvious add action per context.
4. Simplify the crowded header and replace the floating button plus metric footer with one compact
   action dock that keeps price uncertainty visible.
5. Standardize dialogs and sheets so keyboard focus, stacking, scrolling, and mobile behavior are
   reliable across every secondary journey.

## Prioritized audit

| Priority | Area | Observed problem | Why it matters | Recommended change | Expected benefit | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| Critical | Dialogs and sheets | Dialog implementations handle Escape inconsistently and do not trap focus, make the background inert, or restore trigger focus consistently. | Keyboard and screen-reader users can lose context or interact behind a modal. | Introduce one accessible dialog/sheet primitive and migrate every modal flow. | Predictable keyboard control and fewer modal regressions. | Medium |
| High | Shopping list | Progress and every category are separate bordered glass cards. | Repeated containers slow scanning and make ordinary content feel mechanically assembled. | Use one continuous list with typographic category headings and row dividers. | Faster aisle scanning and calmer realistic-density layouts. | Medium |
| High | App shell | A boxed header contains four competing actions; the list switch is also duplicated by a Lists button. | The primary context and action are not immediately clear, especially on mobile. | Use an unboxed two-row app bar; make the title the list switch and reduce utility emphasis. | Clearer location, less crowding, and more usable width. | Medium |
| High | Mobile shopping | A glowing FAB and tall fixed three-metric footer occupy the same visual zone and can cover content. | Core list content loses space and users must parse several equal-weight totals. | Replace both with one compact, reserved-space action dock. | Reliable one-handed add access without obscuring items. | Medium |
| High | First use | A dismissible welcome card duplicates the later empty state and tells users to tap a separate plus control despite presenting its own CTA. | Two versions of the same state create unnecessary choice and contradictory guidance. | Always show one empty state with Add item and Import invoice actions. | Shorter time to first useful list and less copy. | Low |
| High | Visual system | Emerald gradients, glows, blur, background orbs, pills, and large radii appear across all levels. | Decorative depth replaces hierarchy and conflicts with the requested cyan identity. | Adopt neutral semantic surfaces and reserve cyan for action, progress, focus, and selection. | Stronger hierarchy, coherence, and brand recognition. | Medium |
| Medium | Item rows | Photo and overflow controls are always visible and both use framed circular buttons. | Repeated controls compete with item names and checkboxes. | Show an existing photo affordance when relevant; place add photo, edit, and remove in overflow. | Cleaner rows with unchanged capability. | Low |
| Medium | Settings/list manager | Subsections and statuses become nested cards inside a modal; list rows expose three icon actions. | Dense secondary tasks feel heavier than their importance. | Use spacing/dividers and progressive row menus. | Easier reading and fewer accidental actions. | Medium |
| Medium | Composer | The translucent bottom sheet shows competing fixed UI through it; autocomplete lacks active-descendant semantics. | Visual interference and incomplete keyboard feedback undermine rapid entry. | Use an opaque responsive sheet/dialog and complete combobox relationships. | Faster, more dependable multi-item capture. | Medium |
| Medium | Copy/localization | Labels such as Pending, Purchased, Add Item, and AI categorization describe system state or technology rather than the shopper's goal. | Utility language feels mechanical and AI functionality feels bolted on. | Use Still needed, In cart, Add an item, and Improve categories and translate; retain explicit AI privacy disclosure. | More natural, action-oriented comprehension. | Medium |
| Low | Brand assets/metadata | The header uses sparkle imagery and the favicon retains a legacy violet-cyan gradient. | Sparkles imply generic AI branding and assets disagree with the active palette. | Use the shopping-basket mark with a flat cyan treatment and update page metadata. | Product-specific identity with less visual noise. | Low |

## Refined design direction

- **Emotional quality:** quiet, dependable, immediate, and supportive during one-handed shopping.
- **Composition:** one narrow reading column; grouping comes from alignment, spacing, headings, and
  dividers before surfaces.
- **Typography:** system sans; sentence case; 12/14/16/20/28px scale; restrained 600/700 weights.
- **Surfaces:** `background`, `surface`, and `surface-raised`; shadows only for menus/dialogs; no
  backdrop blur, gradients, ambient decoration, or glow.
- **Color:** cyan `#89C3F8` only for primary actions, current state, real progress, and focus.
  Success, warning, and danger remain semantic and never replace written meaning.
- **Shape:** 6px controls, 10px grouped surfaces, 14px dialogs; pills only for compact statuses.
- **Motion:** 120–180ms opacity/translation for state relationships; no bounce or decorative scale;
  reduced-motion preferences remove non-essential movement.
- **Responsive behavior:** 16/24/32px gutters; mobile sheets and a bottom action dock; bounded desktop
  dialogs; no compressed desktop toolbars or hidden functionality.

## Behavioral hypotheses and guardrails

| Hypothesis | Mechanism | Validation signal | Ethical/accessibility guardrail |
| --- | --- | --- | --- |
| One action-led empty state reduces time to first item. | Smart defaults and endowment: start with a meaningful artifact instead of dismissing guidance. | First-item completion time and abandonment in moderated testing. | Import remains available; no signup or permission precedes local value. |
| Concrete in-cart progress improves shopping completion. | Goal gradient based only on checked items. | Users can explain completed and remaining counts; completion rate does not require artificial progress. | Never count app opening, seeded content, or optional metadata. |
| A compact honest total helps budget decisions. | Contextual anchoring with known totals and missing-price coverage. | Users correctly explain what totals include; fewer surprise-cost reports. | Missing prices are never treated as complete information; amount and uncertainty remain together. |
| Progressive row actions reduce accidental edits without hiding capability. | Choice reduction with a clearly labeled overflow menu. | Task time for edit/photo/delete and undo usage. | Keyboard access, visible focus, neutral destructive copy, and recovery remain available. |

No production analytics will be added until CoShop selects a provider. These signals are therefore
documented for future instrumentation and can currently be evaluated through usability sessions,
automated regression tests, and support feedback.

## Validation criteria

- The primary action is obvious within a few seconds in both empty and populated states.
- Accent, borders, and surfaces always communicate a state or grouping relationship.
- A realistic list remains scannable and its last row is not obscured at 320px, 390px, 834px, or
  1440px widths.
- Every modal traps focus, closes with Escape, restores focus, and remains scrollable at 200% text
  sizing.
- Empty, loading, error, success, viewer, partial-price, and over-budget states use written meaning
  in addition to color.
- English, French, German, and Spanish labels fit without horizontal overflow.
- Existing offline, persistence, collaboration, import, export, undo, and privacy behaviors remain
  unchanged.

## Change summary and final quality review

### Implemented changes

| Change | Why | Problem addressed | Shared source affected |
| --- | --- | --- | --- |
| Replaced Emerald Gloss with semantic neutral surfaces and restrained cyan. | Hierarchy now comes from type, spacing, and contrast. | Gradients, glow, blur, excessive radii, and decorative depth. | Global color, type, spacing, radius, motion, focus, and z-index tokens. |
| Rebuilt the shell as an unboxed two-row app bar. | The list context is primary and its title is the list switch. | Crowded header, duplicate Lists action, and icon-frame noise. | App header and responsive gutters. |
| Consolidated first use into one empty state. | Users can create a meaningful first item immediately without dismissing guidance. | Duplicate onboarding/empty states and contradictory plus-button copy. | ShoppingList empty state and localized copy. |
| Flattened category cards into one continuous list. | Aisles and items scan as a shopping document rather than dashboard widgets. | Card nesting, equal visual weight, and dense repeated borders. | ShoppingList, category groups, ItemRow, and section tokens. |
| Replaced the FAB and metric footer with an honest-total action dock. | Add item and decision-relevant cost context share one compact location. | Competing floating controls, mobile obstruction, and three equal-weight totals. | CostFooter remains API-compatible; App composes its Add action. |
| Reduced row actions to existing photo plus overflow. | Names and checkboxes lead while edit/photo/remove remain available. | Repetitive icon controls and accidental-action risk. | ItemRow and reusable menu treatment. |
| Added a shared accessible Dialog primitive. | All modal flows now share focus containment, Escape, inert background, scroll lock, outside-click policy, and trigger restoration. | Inconsistent keyboard behavior, stacking, transparency, and mobile scrolling. | Composer, settings, list manager, sharing, import, photo, and edit dialogs. |
| Completed combobox relationships and restrained add feedback. | Keyboard users receive an active option relationship and rapid-entry confirmation. | Incomplete autocomplete semantics and weak multi-add feedback. | AddItemComposer and localized status copy. |
| Simplified settings, sharing, import, and invitation surfaces. | Secondary work reads as sections and dividers instead of nested cards. | Heavy modal density and AI novelty framing. | Dialog/surface primitives and component-level CSS. |
| Updated all four locales and design-sync guidance. | Labels describe shopper goals and future contributors use the same system. | Mechanical copy and stale glassmorphism instructions. | i18n messages, favicon, metadata, conventions, and previews. |

### Final quality review

- Visually inspected empty and realistic four-item states at 1440×900, 834×1112, and 390×844;
  also inspected composer, settings, and list management in context. Hierarchy and spacing remain
  consistent and no glass, glow, gradient, or decorative background effects remain in runtime UI.
- Automated 320px/200%-text coverage confirms no horizontal overflow. The list-title flex defect
  found during review was corrected by constraining the title/switch to the available width.
- The bottom dock reserves scroll space and the last item can be brought fully above it. It remains
  edge-to-edge on mobile and bounded to the content column on larger screens.
- Serious/critical Axe gates pass for empty, composer, realistic populated, settings, list manager,
  sharing, import, and invitation states. Dialog focus trapping/restoration and menu Escape behavior
  are covered by end-to-end tests.
- Destructive item removal remains recoverable through the existing undo model. Shopping progress
  counts only checked items, and cost context always keeps known totals beside unpriced-item counts.
- `npm run check` passes: TypeScript, 14 unit tests, production/PWA build, and high-severity npm audit.
  `npm run test:e2e` passes 32 desktop/mobile tests.

### Remaining work

- Light mode remains intentionally out of scope.
- Product analytics and behavioral-event instrumentation remain deferred until a provider and
  privacy policy are selected; the hypotheses above define the future signals and harm guardrails.
- The existing production bundle warning slightly exceeds 500 kB for the main chunk. It is not a
  visual regression, but future performance work should split PDF/collaboration code further.
- Real two-account collaboration soak testing and native-device testing remain separate production
  readiness gates; this visual pass did not change their data flows.
