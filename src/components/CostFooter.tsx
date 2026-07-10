import { useMemo } from 'react';
import { ShoppingCart, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import {
  useShopStore,
  selectInCartTotal,
  selectEstimatedTotal,
  selectActiveList,
} from '../store/store';
import './CostFooter.css';

/* ============================================================================
   CostFooter — persistent floating bar at the bottom of the viewport.

   Live-displays:
     1. In-Cart Total  — sum of purchased items
     2. Estimated total — sum of all items
     3. Remaining budget — budget − in-cart total (goes red when over budget)
   ========================================================================== */

export function CostFooter() {
  const budget = useShopStore((s) => selectActiveList(s)?.budget) ?? 0;
  const inCartTotal = useShopStore(selectInCartTotal);
  const estimatedTotal = useShopStore(selectEstimatedTotal);

  const hasBudget = budget > 0;
  const remaining = budget - inCartTotal;
  const overBudget = hasBudget && remaining < 0;
  const progressPct = useMemo(() => {
    if (!hasBudget) return 0;
    return Math.min(100, Math.round((inCartTotal / budget) * 100));
  }, [hasBudget, budget, inCartTotal]);

  const remainingColor = !hasBudget
    ? 'var(--text-tertiary)'
    : overBudget
      ? 'var(--danger)'
      : remaining < budget * 0.1
        ? 'var(--warning)'
        : 'var(--success)';

  return (
    <footer className="cost-footer glass-strong" role="status" aria-live="polite">
      {/* Progress bar — visualises spend vs budget */}
      <div className="cost-footer__progress-track" aria-hidden="true">
        <div
          className={`cost-footer__progress-fill ${overBudget ? 'cost-footer__progress-fill--over' : ''}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="cost-footer__grid">
        <Stat
          icon={<ShoppingCart size={16} />}
          label="In Cart"
          value={`$${inCartTotal.toFixed(2)}`}
          tone="primary"
        />
        <Divider />
        <Stat
          icon={<Receipt size={16} />}
          label="Estimated"
          value={`$${estimatedTotal.toFixed(2)}`}
        />
        <Divider />
        <Stat
          icon={overBudget ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          label={!hasBudget ? 'Remaining' : overBudget ? 'Over by' : 'Remaining'}
          value={hasBudget ? `${overBudget ? '-' : ''}$${Math.abs(remaining).toFixed(2)}` : '—'}
          valueColor={remainingColor}
        />
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------------------
   Stat sub-component
   -------------------------------------------------------------------------- */
interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'default' | 'primary';
  valueColor?: string;
}

function Stat({ icon, label, value, tone = 'default', valueColor }: StatProps) {
  return (
    <div className={`stat ${tone === 'primary' ? 'stat--primary' : ''}`}>
      <span className="stat__icon">{icon}</span>
      <div className="stat__text">
        <span className="stat__label">{label}</span>
        <strong className="stat__value" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="cost-footer__divider" aria-hidden="true" />;
}
