import { ShoppingCart } from 'lucide-react';
import {
  useShopStore,
  selectInCartTotal,
  selectEstimatedTotal,
  selectActiveList,
  selectPriceCoverage,
} from '../store/store';
import './CostFooter.css';
import { useI18n } from '../i18n';

/** Compact, honest shopping summary. Positioning and actions are composed by App. */
export function CostFooter() {
  const activeList = useShopStore(selectActiveList);
  const inCartTotal = useShopStore(selectInCartTotal);
  const knownListTotal = useShopStore(selectEstimatedTotal);
  const coverage = useShopStore(selectPriceCoverage);
  const { locale, t } = useI18n();
  const budget = activeList?.budget ?? 0;
  const currency = activeList?.currency ?? 'USD';
  const hasBudget = budget > 0;
  const remaining = budget - knownListTotal;
  const overBudget = hasBudget && remaining < 0;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);

  return (
    <footer className="cost-footer" role="status" aria-live="polite">
      <ShoppingCart size={18} aria-hidden="true" />
      <div className="cost-footer__content">
        <span className="cost-footer__primary"><span>{t('inCart')}</span> <strong>{money(inCartTotal)}</strong></span>
        <span className="cost-footer__context">
          {t('knownListTotal', { total: money(knownListTotal) })}
          {coverage.missing > 0 && <> · {t('unpricedCount', { count: coverage.missing })}</>}
          {hasBudget && <> · <span className={overBudget ? 'cost-footer__over' : ''}>{t(overBudget ? 'budgetOver' : 'budgetLeft', { amount: money(Math.abs(remaining)), budget: money(budget) })}</span></>}
        </span>
      </div>
    </footer>
  );
}
