# CoShop UX Psychology Review

## Document status

- **Date:** 2026-07-10
- **Status:** Integrated into `docs/phase-1-plan.md`; this document remains the detailed UX
  workstream specification
- **Method:** `$apply-ux-psychology`
- **Scope:** Current React implementation, current UX guidance, and planned production flows
- **Principles:** Smart defaults, goal-gradient progress, reciprocity, endowment/IKEA effect,
  responsible loss aversion, and honest contrast/anchoring

This review treats behavioral principles as design hypotheses, not proof. Every material change
below includes an ethical guardrail and a validation signal. Accessibility, comprehension,
reversibility, privacy, and user control take priority over activation or conversion.

---

## 1. Outcome

CoShop already has several strong foundations: guests receive value without signup, item quantity
defaults to one, product categories are inferred without blocking capture, unknown items remain
editable, prices are optional, and users can name and duplicate lists. These choices reduce effort
and build legitimate ownership.

The highest-risk issue is the current guidance document itself. It contains recommendations for
fake starting progress, obscuring signup language, coercive loss framing, and deliberate price
anchoring. Those recommendations conflict with the new skill's ethics gate and the production
plan's explicit rejection of artificial progress and coercive signup. Correcting that guidance is
a prerequisite to using it as implementation policy.

The highest-risk implemented issues are:

1. Destructive actions permanently delete user work without undo or confirmation.
2. Estimated and budget totals silently treat missing prices as zero, creating a misleading anchor.
3. First-run onboarding asks the user to dismiss a message rather than perform the value action.
4. Seeded items contradict “add your first item” and weaken legitimate ownership.
5. Shopping shows counts but not one clear, real completion path.
6. Zoom is disabled and modal/combobox behavior is incomplete, undermining user control.

---

## 2. Priority model

- **P0 — Trust or user-harm risk:** Correct before relying on the affected flow.
- **P1 — Core activation/execution friction:** Include in the first production-readiness stages.
- **P2 — Retention and differentiation:** Add after durable local data and collaboration foundations.
- **P3 — Optimization:** Validate demand before investing heavily.

| ID | Priority | Finding | Primary principle |
| --- | --- | --- | --- |
| UX-01 | P0 | Current psychology guidance contains dark-pattern recommendations | Ethics |
| UX-02 | P0 | Delete and clear actions are immediate and irreversible | Loss aversion |
| UX-03 | P0 | Missing prices make totals and budget progress misleading | Anchoring |
| UX-04 | P0 | Zoom and modal behavior weaken access and control | Ethics/accessibility |
| UX-05 | P1 | Onboarding dismisses instead of delivering first value | Reciprocity/endowment |
| UX-06 | P1 | Seeded data conflicts with first-use ownership | Endowment |
| UX-07 | P1 | Add-item flow exposes secondary work and can replace typed intent | Smart defaults |
| UX-08 | P1 | Shopping lacks a single, meaningful completion model | Goal gradient |
| UX-09 | P1 | New-list defaults are invisible rather than reviewable | Smart defaults |
| UX-10 | P1 | The default budget is an unsupported monetary anchor | Anchoring |
| UX-11 | P1 | Collaborative branding precedes collaborative capability | Reciprocity/trust |
| UX-12 | P2 | Ownership is configurable but not yet learned or reused | Endowment |
| UX-13 | P2 | Completion state lacks a useful next action | Goal gradient |
| UX-14 | P2 | Permission-heavy features need contextual value and alternatives | Reciprocity |
| UX-15 | P3 | Dense row actions increase choice and accidental-action risk | Smart defaults |

---

## 3. Detailed findings and recommendations

### UX-01 — Replace dark-pattern guidance with ethical, testable guidance

**Priority:** P0

**Observed evidence**

- `docs/ux-psychology-best-practices.md:53-62` says never show 0% and recommends counting app
  opening or a starter catalog as completed progress. That is not completed user work.
- `docs/ux-psychology-best-practices.md:113-114` recommends labeling a commitment action
  “Continue” rather than “Sign up,” obscuring the actual action.
- `docs/ux-psychology-best-practices.md:135-142` recommends making escape costly and emphasizes
  loss over user choice.
- `docs/ux-psychology-best-practices.md:166-177` recommends controlling anchors to make a price or
  deal feel smaller rather than helping users understand it accurately.
- Several numerical research claims have no source and are presented as broadly predictive.

**Affected user/job**

The design and engineering team needs guidance that improves comprehension and task completion
without encouraging manipulation.

**Mechanism**

Ethical behavioral design supports user capability. Fake progress, disguised actions, and
selective anchors exploit rather than assist decision-making.

**Recommendation**

- Rewrite the guidance using the global skill's `references/principles.md` as the normative model.
- Count only real completed work.
- Label signup, payment, permission, and sharing actions explicitly.
- Prefer undo/recovery over coercive warnings.
- Present complete, like-for-like cost context, including uncertainty.
- Either cite research responsibly with scope/limitations or state it as a hypothesis.
- Add a required negative guardrail metric to every behavioral experiment.

**Ethical guardrail**

No UX target may override accessibility, privacy, consent, reversibility, or accurate disclosure.

**Acceptance and validation**

- The revised guide contains no fake progress, confirm-shaming, hidden commitment, fake urgency,
  or selective price anchors.
- A design-review checklist explicitly asks whether a user would accept the mechanism if explained.
- Reviewers can distinguish evidence, hypothesis, and implementation rule.

### UX-02 — Make destructive actions proportionate and recoverable

**Priority:** P0

**Observed evidence**

- Item delete executes immediately in `src/components/ItemRow.tsx:106-112`.
- List delete executes immediately in `src/components/ListManager.tsx:150-158`.
- Clear purchased permanently removes all purchased items in
  `src/components/ShoppingList.tsx:70-77`.
- The current store filters records immediately in `src/store/store.ts:224-232`,
  `src/store/store.ts:310-317`, and `src/store/store.ts:332-338`.

**Affected user/job**

Shoppers need to act quickly with one hand without losing a list or purchase history through a
mistap.

**Mechanism**

Loss framing is appropriate only for real consequential loss. Recovery is more effective and less
disruptive than repeatedly asking “Are you sure?”

**Recommendation**

- Use immediate optimistic removal plus an undo snackbar for one item.
- Rename “Clear” to “Clear purchased” and provide an undo that restores the exact set.
- Soft-delete records into recently deleted/trash with an explicit retention window.
- For a populated list, confirm with its name and item count: “Delete ‘Weekly Groceries’ and its
  14 items?” State the recovery window.
- Do not confirm deletion of a trivial empty list if it remains recoverable.
- Synchronize delete/restore as versioned tombstones once collaboration exists.

**Ethical guardrail**

Use neutral actions such as “Keep list” and “Move to recently deleted.” Do not use “I’ll risk
losing it” or other confirm-shaming.

**Acceptance and validation**

- Every destructive action is reversible or names concrete, irreversible consequences.
- Undo restores IDs, ordering, status, prices, categories, and attachments.
- Track `undo_offered`, `undo_used`, and recovery-related support incidents.
- A high undo rate indicates placement or action design needs correction, not stronger warnings.

### UX-03 — Disclose incomplete prices before showing financial anchors

**Priority:** P0

**Observed evidence**

- Missing price contributes zero in `src/store/store.ts:448-456`.
- The footer presents exact-looking “In Cart,” “Estimated,” and “Remaining” values in
  `src/components/CostFooter.tsx:51-70` without stating that items may be unpriced.
- The budget progress bar uses the purchased-price total only and caps at 100% in
  `src/components/CostFooter.tsx:25-31`, which can understate uncertainty and obscure overspend.

**Affected user/job**

Budget-conscious shoppers need to understand whether the displayed total is complete enough to
support a purchase decision.

**Mechanism**

Numbers become anchors even when incomplete. Honest contrast requires basis, coverage, and
uncertainty.

**Recommendation**

- Show price coverage: “$34.20 estimated · 3 items unpriced.”
- Label purchased-price totals as “Known in cart” until all purchased items have prices.
- Separate item-completion progress from budget/spend progress.
- Show both amount and context: “$34.20 of $80 budget,” not an unlabeled color bar alone.
- Preserve over-budget magnitude visually; do not let a capped bar imply that 110% and 200% are
  equivalent. A capped fill may remain, but add explicit text and an overrun marker/state.
- Use locale and currency settings and integer minor units in the production model.
- Do not infer a price or budget without a trustworthy source and clear label.

**Ethical guardrail**

Never frame missing data as zero or present savings without source, package basis, region, currency,
and observation date.

**Acceptance and validation**

- Users can explain what is included in “estimated,” “in cart,” and “remaining.”
- Totals expose unpriced counts and never silently imply completeness.
- Test comprehension, budget surprise rate, price-entry abandonment, and correction rate.

### UX-04 — Restore accessibility and interaction control

**Priority:** P0

**Observed evidence**

- `index.html:6` disables user scaling.
- Dialogs use `aria-modal` but do not trap focus, make the background inert, or restore trigger
  focus (`src/components/AddItemComposer.tsx:119-127`, `src/components/ListManager.tsx:73-81`,
  `src/components/ItemRow.tsx:178-185`, and `src/components/ItemRow.tsx:263-270`).
- Autocomplete lacks complete combobox relationships and active-descendant semantics in
  `src/components/AddItemComposer.tsx:140-170`.

**Affected user/job**

Users with low vision, mobility limitations, screen readers, keyboards, or situational impairment
need the same ability to understand and control the shopping flow.

**Mechanism**

Behavioral hierarchy is not ethical when users cannot perceive, reach, escape, or reverse it.

**Recommendation**

- Restore pinch/ browser zoom.
- Build one accessible dialog primitive with focus lifecycle, Escape, inert background, scroll
  locking, title/description, and trigger restoration.
- Implement a standards-compliant combobox with an explicit free-text option.
- Add visible focus, meaningful labels, status announcements, and generous touch targets.
- Validate at 200% text zoom, narrow widths, reduced motion, keyboard only, and screen readers.

**Ethical guardrail**

Do not reduce accessibility to preserve visual density, animation, urgency, or conversion.

**Acceptance and validation**

- Core flows pass automated accessibility tests and manual keyboard/screen-reader review.
- No modal permits focus behind it.
- Zoom and text resizing do not hide actions or content.

### UX-05 — Turn onboarding into the first value action

**Priority:** P1

**Observed evidence**

- Onboarding says “Tap the + button to add your first item,” but its primary CTA is “Got it” and
  only dismisses the message in `src/App.tsx:174-191`.
- The actual add control remains separate at `src/App.tsx:58-64`.

**Affected user/job**

A first-time user needs to create one useful artifact with minimal explanation.

**Mechanism**

Reciprocity and legitimate endowment begin when the product helps create something useful, not
when the user dismisses product education.

**Recommendation**

- Replace the passive coachmark CTA with “Add my first item,” opening the focused composer.
- Retain a quiet “Not now” or close action.
- After the first item, briefly confirm the real value: “Bananas added to Fruits.”
- Teach features contextually after use rather than front-loading multiple coachmarks.
- Do not show fabricated “Step 1 complete” progress merely because the app was opened.

**Ethical guardrail**

The user must be free to dismiss onboarding and use the app directly. Do not block the list behind
a tutorial.

**Acceptance and validation**

- Measure time to first user-created item, onboarding-to-composer rate, first-item completion, and
  dismiss recovery.
- Disconfirm the change if it increases confusion or delays direct use compared with the visible FAB.

### UX-06 — Remove automatic demo ownership

**Priority:** P1

**Observed evidence**

- First launch creates five seed items and a $120 budget in `src/store/store.ts:137-166`.
- Onboarding simultaneously describes adding a first item in `src/App.tsx:184-187`.

**Affected user/job**

A new user needs to understand which data is theirs and build a list that reflects a real need.

**Mechanism**

Prepopulated content can demonstrate UI, but it does not create legitimate ownership and can make
real versus demo state ambiguous.

**Recommendation**

- Start with one clearly named, empty, editable list.
- Offer “Load a demo list” only in development, screenshots, or an explicit exploration path.
- Use recent/frequent suggestions after the household has real history.
- Preserve a meaningful editable default list name without inventing items or money.

**Ethical guardrail**

Never count catalog availability or seeded content as user progress.

**Acceptance and validation**

- First launch contains no unexplained purchases, prices, or budget.
- Test empty-start versus explicit-demo comprehension and time to first real item.

### UX-07 — Make fast capture truly primary

**Priority:** P1

**Observed evidence**

- Quantity correctly defaults to one, category is inferred, and price remains optional in
  `src/components/AddItemComposer.tsx:26-29` and `:175-208`.
- Price and quantity are always visible even when the user only needs to capture a name.
- Enter selects the highlighted catalog suggestion whenever suggestions exist in
  `src/components/AddItemComposer.tsx:95-115`; this can replace the user's intended free text.
- The sheet resets and stays open after add, which supports rapid entry.

**Affected user/job**

Users need to capture an item before they forget it, often one-handed and without price knowledge.

**Mechanism**

Smart defaults reduce decisions only when the default does not override explicit intent. Secondary
fields should not compete with the primary capture action.

**Recommendation**

- Make name/search and “Add” the primary surface.
- Move price, quantity, category, note, photo, and store into an expandable “Add details” area;
  keep quantity one unless changed.
- Include an explicit “Add ‘typed text’” option above/below catalog suggestions.
- Preserve draft text across accidental close, PWA update, and backgrounding.
- Add recent/frequent suggestions and multi-item paste only after the durable repository exists.
- Change confirmation copy to a specific result when useful: “Added to Weekly Groceries.”

**Ethical guardrail**

Catalog confidence must not silently rewrite explicit user text. Every inferred category remains
easy to correct.

**Acceptance and validation**

- Median known-item capture under three seconds.
- Track suggestion acceptance, free-text choice, category correction, draft recovery, and
  add-flow abandonment.
- Guardrail: duplicate or wrong-product rate must not increase as capture gets faster.

### UX-08 — Define real shopping progress

**Priority:** P1

**Observed evidence**

- Pending and purchased sections expose separate counts in
  `src/components/ShoppingList.tsx:46-86`.
- There is no single statement such as “4 of 12 in cart · 8 left.”
- The only visual progress bar represents known spend against budget, not shopping completion.

**Affected user/job**

An in-store shopper needs to know what remains and when the trip is complete.

**Mechanism**

Goal-gradient support is useful when the finish line is real and task-specific.

**Recommendation**

- Add an explicit shopping mode with “X of Y in cart” and “Y left.”
- Base item completion on actual status changes; never count opening the app or catalog setup.
- Surface “2 items left” near completion without urgency or gamified pressure.
- Collapse purchased groups by default in shopping mode while keeping undo available.
- Keep spend/budget progress visually and semantically separate.
- Provide an explicit “Finish trip” action only if it performs useful work, such as archiving the
  session, preserving purchased history, or preparing a reusable list.

**Ethical guardrail**

Do not reward overspending or pressure users to buy optional items merely to reach 100%.

**Acceptance and validation**

- Users can state how many items remain at a glance.
- Measure shopping completion time, accidental toggles, reopen/undo, and abandonment.
- Guardrail: users must be able to leave items pending without negative language.

### UX-09 — Make list defaults visible and editable

**Priority:** P1

**Observed evidence**

- The new-list input is blank with “New list name (optional)” in
  `src/components/ListManager.tsx:167-179`.
- The store generates a date-based name only after submission in `src/store/store.ts:104-108` and
  `:180-190`.
- The button says “New,” describing mechanism rather than result.

**Affected user/job**

Users need to create and later recognize a list without inventing a naming scheme.

**Mechanism**

A smart default should be visible for review, not hidden until after commitment.

**Recommendation**

- Prefill the input with a visible editable name based on context, such as “Groceries” or
  “Weekly groceries · Jul 10.”
- Use “Create list” or “Create ‘Groceries’” as the action.
- Offer lightweight templates only when they reflect real use: Groceries, Party, Household, Trip.
- Do not create multiple choices before the user needs them.

**Ethical guardrail**

Do not infer sensitive events or location in a list name. Make the default easy to replace.

**Acceptance and validation**

- Track rename-within-five-minutes and default-change rates.
- A high immediate rename rate disconfirms the default.

### UX-10 — Remove the unsupported default budget

**Priority:** P1

**Observed evidence**

- Fresh state assigns a $120 budget in `src/store/store.ts:150-166`.
- The header and footer immediately frame shopping against that number.

**Affected user/job**

Users need financial context that reflects their household, currency, trip, and intended scope.

**Mechanism**

The first number becomes an anchor. A fabricated budget can distort expectations and create false
authority.

**Recommendation**

- Leave budget unset until the user chooses one.
- Offer budget context after the list has a purpose or when the user opens cost controls.
- If suggesting a prior value later, label it “Use last trip's budget: €80” with source/date.
- Format currency by locale and never carry a budget across currencies silently.

**Ethical guardrail**

Do not choose a monetary default simply to make later totals or premium pricing feel smaller.

**Acceptance and validation**

- First launch contains no unsupported financial anchor.
- Track voluntary budget adoption and whether users understand its scope.

### UX-11 — Align the collaboration promise with available value

**Priority:** P1

**Observed evidence**

- Product metadata calls CoShop collaborative in `package.json:6`, `vite.config.ts:15-17`, and
  `index.html:10`, while current state is local-only.
- The production plan correctly preserves full guest use and introduces signup for sharing/backup.

**Affected user/job**

Users need accurate expectations about whether another person will see their changes and whether
data is backed up.

**Mechanism**

Reciprocity depends on delivering the claimed value before asking for commitment.

**Recommendation**

- Until collaboration ships, describe the product as an offline-first shopping list prototype.
- Keep all local list functionality available before authentication.
- Trigger account creation from explicit “Share,” “Back up,” or “Use on another device” intent.
- Use concrete copy: “Create an account to invite Alex to ‘Weekly Groceries’.”
- Preserve and import guest data before marking signup complete.
- After sync exists, show honest local/sync state rather than implying cloud safety.

**Ethical guardrail**

Do not use fear about losing data unless the risk is real, specific, and paired with export or
backup actions. Declining signup must preserve local use.

**Acceptance and validation**

- No public copy claims unavailable collaboration or backup.
- Measure guest value events before account prompts, share-intent completion, import success, and
  decline recovery.

### UX-12 — Turn customization into reusable household value

**Priority:** P2

**Observed evidence**

- Users can name/duplicate lists, tag a store, and correct “Other” categories.
- Category corrections, store ordering, and recurring items are not yet learned or reused.

**Affected user/job**

Returning households need the product to reflect how they actually shop without repeatedly
configuring it.

**Mechanism**

Legitimate endowment grows when personalization improves future utility and remains portable.

**Recommendation**

- Learn household-specific aliases only after explicit correction.
- Remember recent/frequent items and store-specific category order.
- Add “repeat last shop,” templates, favorites, and recurring staples before complex meal planning.
- Make learned behavior inspectable, editable, exportable, and resettable.

**Ethical guardrail**

Do not turn personalization into lock-in or infer sensitive household traits for targeting.

**Acceptance and validation**

- Measure repeat-item reuse, correction reduction, template reuse, and reset/export success.
- Guardrail: recommendations must not increase unwanted or duplicate purchases.

### UX-13 — Give completion a useful, calm next action

**Priority:** P2

**Observed evidence**

- The completed state says only “All items in cart. Nice shopping!” in
  `src/components/ShoppingList.tsx:56-60`.
- Purchased items remain grouped below and can be permanently cleared.

**Affected user/job**

After shopping, users may need to review spend, retain history, reuse the list, or simply close the
app.

**Mechanism**

A completion moment should confirm real accomplishment and offer relevant continuation, not force
celebration or another engagement loop.

**Recommendation**

- Confirm the real outcome: “12 of 12 in cart.”
- Offer context-dependent actions: “Review trip,” “Keep purchased,” or “Prepare next list.”
- Preserve history by default once durable storage exists; do not force clearing.
- Keep celebration subtle for a high-frequency utility app and respect reduced motion.

**Ethical guardrail**

Do not use completion to push sharing, ratings, upgrades, or referrals before the user can finish
their task.

**Acceptance and validation**

- Test whether users understand what happens to purchased items after completion.
- Track next-action use, accidental clear, and repeat-list creation.

### UX-14 — Request permissions only after contextual value is clear

**Priority:** P2

**Observed evidence**

- Current photo capture is initiated from a specific item action, which is a good contextual start.
- Planned voice, OCR, and location features introduce microphone, camera, image, and location data.

**Affected user/job**

Users need to understand why sensitive access is needed and retain a manual path if they decline.

**Mechanism**

Reciprocity works when the product demonstrates or explains concrete value before a permission ask.

**Recommendation**

- Explain the immediate result before invoking the system permission.
- Request camera, microphone, or location only after the corresponding user action.
- Provide manual add, upload, and store selection alternatives.
- Preview voice/OCR results before mutating the list.
- State whether processing is local or cloud-based and how images/audio/location are retained.

**Ethical guardrail**

Never degrade unrelated functionality, repeatedly nag, or imply that optional permission is
required.

**Acceptance and validation**

- Measure permission prompt-to-value completion, decline recovery, error rate, and deletion of
  captured data.

### UX-15 — Reduce row-level choice density without hiding capability

**Priority:** P3

**Observed evidence**

- Every row shows photo, edit, and delete icon actions in addition to purchase and category controls
  in `src/components/ItemRow.tsx:84-114`.

**Affected user/job**

In-store users need a large, fast purchase target; planning users need secondary editing tools.

**Mechanism**

Progressive disclosure reduces visual competition and accidental activation, but hidden actions can
harm discoverability and accessibility.

**Recommendation**

- Keep purchase status and item identity primary.
- Move photo/edit/delete to one clearly labeled accessible details/overflow action, or expose them
  in planning mode and simplify shopping mode.
- Keep delete recoverable and provide keyboard/screen-reader equivalent actions.
- Validate with actual one-handed use before adopting swipe gestures.

**Ethical guardrail**

Do not hide critical safety, privacy, or cancellation controls merely to make the UI look simpler.

**Acceptance and validation**

- Measure purchase-toggle time, wrong-action rate, secondary-action discovery, and task success for
  keyboard and screen-reader users.

---

## 4. Recommended target flows

### 4.1 First use

1. Open one empty, sensibly named list with no fake items or budget.
2. Show one short explanation and primary action: “Add my first item.”
3. Open the composer with name focused.
4. Add the user's item and confirm its actual category/list.
5. Let the user continue adding or return to the list; do not request signup yet.
6. Introduce backup/sharing only when the user invokes those capabilities.

### 4.2 Item capture

1. Present item name, recent/frequent suggestions, and an explicit free-text choice.
2. Infer category and quantity one without overriding text.
3. Hide optional detail fields behind “Add details.”
4. Add optimistically and provide specific confirmation.
5. Preserve draft and allow immediate next entry.

### 4.3 Shopping mode

1. Enter explicitly or infer from a user action such as “Start shopping.”
2. Show “X of Y in cart · Y left.”
3. Sort by store/category order; collapse purchased items.
4. Keep one large purchase action and accessible undo.
5. Show financial totals separately with price coverage.
6. On completion, confirm actual count and offer review/finish without pressure.

### 4.4 Delete and recovery

1. Remove a single item immediately and offer undo.
2. Move list and bulk deletions to recently deleted.
3. Name list, item count, and retention window for consequential deletion.
4. Synchronize tombstones and restore operations.
5. Purge only after the documented retention window.

### 4.5 Sharing and account creation

1. Let guests create and shop with local lists.
2. Begin auth only after “Share,” “Back up,” or multi-device intent.
3. Explain the exact value and data scope.
4. Import local work with real progress and recovery.
5. Complete the requested share/backup action after auth.
6. Preserve local use if the user declines or auth fails.

### 4.6 Budget and price context

1. Start without an arbitrary budget.
2. Let the user opt into a locale/currency-aware budget.
3. Show known total and unpriced item count.
4. Separate estimated-all, known-in-cart, and shopping-completion progress.
5. Label later retailer prices with source, time, package basis, region, and currency.

---

## 5. Measurement plan

Events must avoid raw item names, notes, photos, invite tokens, precise location, and other sensitive
content.

| Hypothesis | Primary metric | Harm guardrail | Decision signal |
| --- | --- | --- | --- |
| Actionable onboarding shortens activation | Median time to first user-created item | Dismiss recovery and confusion reports | Ship only if time improves without lower task success |
| Progressive add details speeds capture | Median add completion time | Wrong item/category and duplicate rate | Ship only if speed improves without accuracy loss |
| Explicit free-text choice preserves intent | Free-text completion success | Accidental suggestion acceptance | Ship if wrong-product reversals decrease |
| Item progress improves shopping execution | Completion time and at-a-glance comprehension | Pressure to buy unwanted items | Ship only if users understand pending items remain optional |
| Undo reduces accidental loss | Recovery success and support incidents | Excessive undo indicates poor action placement | Redesign placement if undo rate is persistently high |
| Price coverage improves budget comprehension | Correct explanation of totals | Price-entry burden and abandonment | Ship if comprehension improves without forced pricing |
| Contextual signup improves trust | Share/backup completion after intent | Guest-flow completion and decline recovery | Never optimize conversion by degrading guest use |
| Learned household defaults reduce repetition | Reuse and correction reduction | Unwanted/duplicate recommendation rate | Default-on only after low correction and clear reset |

### Minimum qualitative validation

- Five moderated first-use sessions across varied technical confidence.
- Five one-handed shopping-mode sessions using realistic distraction and movement.
- Keyboard-only and screen-reader task completion.
- 200% zoom and narrow viewport review.
- Budget comprehension interviews with incomplete prices.
- Destructive-action and account-decline recovery tests.

Sample sizes above are formative, not statistical proof. Use telemetry and broader research before
generalizing.

---

## 6. Ethics and accessibility release gate

- [ ] Defaults are appropriate, visible, and easy to change.
- [ ] No monetary value, privacy choice, or marketing consent is fabricated or preselected.
- [ ] Progress represents actual user-completed work.
- [ ] Signup, payment, permission, and sharing actions are labeled explicitly.
- [ ] Guests receive meaningful value before identity requests.
- [ ] Declining optional actions preserves unrelated work.
- [ ] Personalization improves utility and is editable, resettable, and exportable.
- [ ] Consequential loss is concrete and recoverable where feasible.
- [ ] Trivial reversible actions do not receive coercive confirmation.
- [ ] Financial comparisons disclose completeness, basis, currency, source, and time.
- [ ] No fake urgency, scarcity, social proof, progress, savings, or original price exists.
- [ ] Keyboard, screen reader, zoom, touch, contrast, and reduced motion remain supported.
- [ ] Privacy and permission disclosures match actual processing and retention.
- [ ] Every experiment includes a user-harm guardrail and rollback threshold.
- [ ] A user would reasonably accept the mechanism if it were explained plainly.

---

## 7. Implementation-plan integration map

Do not add all findings as one feature. Integrate them into existing stage dependencies:

### Stage A — Baseline, safety, and delivery pipeline

- UX-01 revise the normative UX guidance.
- UX-04 accessibility foundations.
- UX-05 actionable onboarding.
- UX-06 remove automatic seeds.
- UX-09 visible list defaults.
- UX-10 remove unsupported budget.
- UX-11 align public copy with available capability.

### Stage B — Durable local-first foundation

- UX-02 undo, soft delete, trash, and restore.
- UX-03 complete price coverage and locale-safe money.
- UX-07 composer draft recovery.

### Stage C — Accounts, backup, and collaboration

- UX-11 contextual account/share/backup flow.
- UX-14 permission/data-scope disclosures for remote media and sharing.

### Stage D — Best-in-class capture and shopping mode

- UX-07 progressive capture, free-text intent, history-based suggestions.
- UX-08 real shopping progress.
- UX-12 learned household defaults and reusable ownership.
- UX-13 calm completion and next action.
- UX-15 planning-versus-shopping action density.

### Later stages

- Apply UX-14 to voice, OCR, and location permission flows.
- Apply UX-03 to retailer prices, offers, and savings.
- Re-run the full ethics gate before monetization or referral design.

---

## 8. Explicit non-recommendations

CoShop should not implement:

- Fake pre-completed onboarding steps.
- Profile/list “strength” meters that pressure optional configuration.
- “Continue” when the actual action is signup, payment, sharing, or permission.
- Confirm-shaming such as “I’ll risk losing my lists.”
- Artificial countdowns, scarcity, urgency, or expiring protection.
- Arbitrary budgets or prices chosen to anchor perception.
- Higher comparison prices selected primarily to make another price feel smaller.
- Completion pressure that encourages unwanted purchases.
- Permission nagging or degradation of unrelated manual functionality.
- Personalization that cannot be inspected, reset, exported, or deleted.

The governing test is simple: would the user still accept the design if CoShop explained exactly
how and why it works? If not, revise or reject it.
