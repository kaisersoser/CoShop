import { CostFooter } from 'coshop';

// Shows the floating cost summary bar. Store auto-seeds with $11.99 in-cart,
// ~$51.65 estimated, $108 remaining on a $120 budget. Component is position:fixed
// inside the preview iframe — sits at the viewport bottom as it does in the app.
export function BudgetSummary() {
  return (
    <div style={{ height: 200, background: 'var(--bg-base)' }}>
      <CostFooter />
    </div>
  );
}
