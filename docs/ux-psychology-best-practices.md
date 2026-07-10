# UX Psychology Best Practices

A checklist of six psychology-driven design principles that CoShop — and any future app we
build — should follow. Each principle includes the underlying research, a general rule, and
concrete ways to apply it in CoShop.

> **Core insight:** Users don't make purely logical decisions. Defaults read as
> recommendations, the first number sets the anchor, a gift creates a debt, building something
> makes it yours, and even fake progress creates real momentum. Design for how people actually
> think, not how we wish they thought.

---

## 1. Smart Defaults — never show a blank form

**Principle:** Every empty field is a decision, and stacking decisions causes *decision fatigue*.
Faced with too many choices, people often make none and leave.

**Evidence:**
- Columbia jam study: 24 flavors → 3% bought; 6 flavors → 30% bought. More choice = harder, not
  better.
- 70–90% of users never change a default. A good default reads as *"this is what most people
  pick"* — a recommendation, not just a value.

**Rules:**
- Pre-fill every field with the most common / most likely choice.
- Shift the user's job from "fill this out from scratch" to "scan and adjust what doesn't fit."
- Make buttons state the payoff, not the mechanism (e.g. "See 12 results" beats "Search").
- Reduce the *number* of choices presented at once; reveal advanced options progressively.

**Apply in CoShop:**
- New item form: default quantity to `1`, default category to the catalog's best-guess match,
  leave price empty (it's optional) rather than demanding it.
- Unknown items file under "Other" automatically with a one-tap category picker — never block
  the add on a required decision.
- Autocomplete pre-selects the top catalog match so the user confirms rather than types.
- "Create list" pre-fills a sensible name (e.g. "Groceries" or today's date) instead of an empty
  field.
- Add-to-list button could read "Add — 8 items ready" style confirmations where a count adds value.

---

## 2. Goal-Gradient — never start a user at zero

**Principle:** The closer people feel to a finish line, the faster they move toward it (*goal
gradient effect*). Critically, **you choose where the starting line is drawn.**

**Evidence:**
- Car-wash study: a 10-stamp card with 2 pre-filled beat an 8-stamp card at nearly double the
  completion rate — same 8 washes required.
- LinkedIn's profile-strength meter is never at 0% from the moment you sign up.

**Rules:**
- Never display 0% progress. Find something the user already did and count it.
- Reframe unavoidable steps (account creation, opening the app) as "Step 1 — done."
- Show visible progress toward a concrete finish line.

**Apply in CoShop:**
- Onboarding coachmarks: show "Step 1 of 3 complete" the moment the app opens — installing/opening
  counts as the first step.
- First-list creation screen shows a progress meter that already includes the starter catalog as a
  completed setup step.
- List completion: show "3 of 12 items checked" progress, and when a list is nearly done, surface
  it ("Almost there — 2 items left") to pull the user to the finish.
- Profile/list "strength" indicators (has a store tag, has a name, has categories) that start above
  zero.

---

## 3. Reciprocity — give value before you ask for anything

**Principle:** When you give first, people feel a pull to return the favor (*reciprocity*).
Cialdini ranked it the single most powerful driver of human behavior. Asking before delivering any
value ("sign up to see results") reads as holding results hostage — users walk.

**Evidence:**
- Free grocery samples increase purchases up to 2,000%.
- Costco (samples), Spotify (30 days premium), Notion (full product before paying) all give
  substantial value before the ask.

**Rules:**
- Deliver a genuinely useful result *before* requesting signup/email/payment.
- Give enough to be valuable, then offer the "complete" version as the upgrade.
- The ask should never feel like a wall, because the user already received something worth
  returning for.

**Apply in CoShop:**
- CoShop is already local-first with no accounts — lean into it. The user builds real lists and
  gets full value with zero signup. Any future sync/collaboration/premium ask comes *after* they
  have lists worth protecting.
- If we ever add accounts: let users build and use lists first, then offer sync as "keep these
  lists safe across devices" — an upgrade to something they already own, not a gate.
- OCR/voice/catalog features should produce a usable result immediately (parsed items, categorized
  list) before prompting for any permission-heavy or paid step.

---

## 4. Endowment & IKEA Effect — let users build before they commit

**Principle:** People value things they built (*IKEA effect*) or merely feel they own (*endowment
effect*) far more than identical things handed to them. Investment creates attachment; attachment
prevents abandonment.

**Evidence:**
- IKEA furniture feels better because you assembled it.
- Duolingo has you pick a language, set a goal, and finish a lesson *before* the signup screen —
  by then you've invested ~10 minutes you won't throw away.

**Rules:**
- Let users create and customize *before* any signup/commitment gate.
- Every customization (name, color, choice) deepens ownership — offer meaningful, lightweight
  personalization early.
- Label the forward action "Continue," not "Sign up" — leaving should feel like abandoning
  something they made.

**Apply in CoShop:**
- Let users name lists, tag them with a store/location, pick categories, and add items with no
  account required — every list becomes "theirs."
- Onboarding should get the user to add their *first item* immediately (the plan already targets
  this) — that first built artifact is the hook.
- Offer light customization: list names, optional store tags, category ordering. Small ownership
  cues compound.
- Any future commitment step uses "Continue" framing on top of work already done, never a cold
  "Sign up."

---

## 5. Loss Aversion — frame around what users stand to lose

**Principle:** The pain of losing is ~2× the pleasure of gaining the same thing (Kahneman).
Framing a feature as a potential *gain* uses the weaker motivator; *status quo bias* means people
fight to protect what they already have.

**Evidence:**
- "Upgrade now / maybe later" has zero psychological weight — nothing is at stake.
- Reframing to show the *specific things about to be lost* (files by name, with a countdown) and a
  dismissive that costs something ("I'll risk it") converts far better.

**Rules:**
- When asking users to act, show what they'll *lose by inaction*, not just what they'd gain.
- Make loss concrete and specific (name the actual items/data at risk), not abstract.
- Don't offer a frictionless, consequence-free escape hatch for consequential decisions.

**Apply in CoShop (use responsibly — see ethics note):**
- Deleting a list: confirm with the concrete stakes — "Delete 'Weekly Groceries' and its 14
  items? This can't be undone" — rather than a generic "Are you sure?"
- Unsaved changes / clearing a list: surface exactly what disappears.
- If sync/backup is ever offered, frame it as protecting the lists they've built ("Don't lose your
  14 lists if you switch phones"), not an abstract feature gain.
- **Do not** manufacture fake urgency, fake countdowns, or dark-pattern loss framing on trivial
  actions. Loss framing is for genuine, real consequences only.

---

## 6. Contrast & Anchoring — control what the user sees first

**Principle:** The brain evaluates every price/value *relative* to what it saw immediately before
(*contrast effect* / anchoring). The same number feels expensive or trivial depending on context.

**Evidence:**
- A $50 plan in isolation reads as "$600/year — a lot." The same $50 shown right under a $1,900
  laptop, labeled "just 2.6%," barely registers.
- Restaurants price a $90 steak to make the $40 salmon look reasonable; agents show an overpriced
  house first.

**Rules:**
- Never present a cost in isolation — control the reference point the user sees first.
- Anchor against a larger, relevant number so the target feels small.
- Express costs as a small proportion of something bigger where honest and relevant.

**Apply in CoShop:**
- Budget/CostFooter: show item or list cost against the total budget ("$12 of your $80 budget")
  so individual additions feel proportionate rather than alarming.
- If premium/paid tiers ever exist, anchor against the value delivered (e.g. total grocery spend
  managed) rather than showing the fee alone.
- When showing savings or price comparisons across stores, lead with the higher reference price so
  the chosen option reads as the deal.

---

## Ethics & Guardrails

These principles are persuasion tools; used honestly they make products genuinely easier and more
valuable to use. Used dishonestly they become dark patterns that erode trust.

**Do:**
- Use smart defaults that truly reflect the best choice for most users.
- Count real progress and give real value first.
- Show real consequences and real reference prices.

**Don't:**
- Fabricate urgency, countdowns, or scarcity that isn't real.
- Use loss framing to pressure users over trivial or reversible actions.
- Default users into choices that benefit us at their expense (opt-out traps, hidden charges).
- Anchor against fake "original" prices.

The test: *would the user thank us if they understood exactly what we did?* If yes, ship it. If
no, it's a dark pattern — cut it.

---

## Quick Review Checklist

Before shipping any screen or flow, confirm:

- [ ] No blank forms — every field has a smart default.
- [ ] No 0% progress state — the user starts with visible momentum.
- [ ] Real value is delivered before any signup/permission/payment ask.
- [ ] Users can build/customize something *theirs* before committing.
- [ ] Consequential actions name the concrete stakes (loss framing), trivial ones don't.
- [ ] No cost or number is shown in isolation — there's an honest anchor.
- [ ] Every persuasion technique passes the "would the user thank us?" test.
