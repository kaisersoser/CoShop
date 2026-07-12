import { useMemo } from 'react';
import { useShopStore, selectActiveItems } from '../store/store';
import type { ShoppingItem } from '../store/store';
import { getCategory, categoryOrder } from '../data/categories';
import { ItemRow } from './ItemRow';
import { CategoryIcon } from './categoryIcon';
import { CheckCircle2, FileUp, PackageOpen, Trash2 } from 'lucide-react';
import './ShoppingList.css';
import { useI18n } from '../i18n';

/* ============================================================================
   ShoppingList — groups items by product CATEGORY and splits by purchase
   state. The "Other" bucket always sorts last.
   ========================================================================== */

/** Distinct category ids present in a set of items, in display order. */
const orderedCategories = (buckets: Record<string, ShoppingItem[]>): string[] =>
  Object.keys(buckets).sort((a, b) => categoryOrder(a) - categoryOrder(b));

export function ShoppingList({ onAdd, onImport, canEdit = true }: { onAdd: () => void; onImport: () => void; canEdit?: boolean }) {
  const items = useShopStore(selectActiveItems);
  const clearPurchased = useShopStore((s) => s.clearPurchased);
  const { t } = useI18n();

  // Bucket items by category + status for stable, performant rendering.
  const { pendingByCat, purchasedByCat, pendingCount, purchasedCount } = useMemo(() => {
    const pending: Record<string, ShoppingItem[]> = {};
    const purchased: Record<string, ShoppingItem[]> = {};
    let pendingCount = 0;
    let purchasedCount = 0;

    for (const it of items) {
      if (it.isPurchased) {
        (purchased[it.category] ??= []).push(it);
        purchasedCount++;
      } else {
        (pending[it.category] ??= []).push(it);
        pendingCount++;
      }
    }
    return { pendingByCat: pending, purchasedByCat: purchased, pendingCount, purchasedCount };
  }, [items]);

  if (items.length === 0) {
    return <EmptyState onAdd={onAdd} onImport={onImport} canEdit={canEdit} />;
  }

  return (
    <div className="shopping-list">
      <div className="shopping-progress" role="status" aria-label={t('progressAria', { done: purchasedCount, total: items.length })}>
        <div><span>{t('shoppingProgress')}</span><strong>{t('progressInCart', { done: purchasedCount, total: items.length })}</strong></div>
        <div className="shopping-progress__track" aria-hidden="true"><span style={{ width: `${Math.round((purchasedCount / items.length) * 100)}%` }} /></div>
      </div>
      {/* Pending section */}
      <SectionHeader title={t('pending')} count={pendingCount} />
      <div className="shopping-list__groups">
        {orderedCategories(pendingByCat).map((cat) => (
          <CategoryGroup key={`p-${cat}`} category={cat} items={pendingByCat[cat]} canEdit={canEdit} />
        ))}
      </div>

      {pendingCount === 0 && (
        <div className="shopping-list__all-done">
          <CheckCircle2 size={24} />
          <p>{t('allInCart')}</p>
          {canEdit && <button className="btn-ghost" onClick={onAdd}>{t('addAnother')}</button>}
        </div>
      )}

      {/* Purchased section */}
      {purchasedCount > 0 && (
        <>
          <SectionHeader
            title={t('purchased')}
            count={purchasedCount}
            action={canEdit ? <button
                className="btn-ghost shopping-list__clear"
                onClick={clearPurchased}
                aria-label={t('clearPurchased')}
              >
                <Trash2 size={14} /> {t('clear')}
              </button> : undefined}
          />
          <div className="shopping-list__groups shopping-list__groups--done">
            {orderedCategories(purchasedByCat).map((cat) => (
              <CategoryGroup key={`d-${cat}`} category={cat} items={purchasedByCat[cat]} dimmed canEdit={canEdit} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   CategoryGroup — a quiet labelled section containing rows for one category.
   -------------------------------------------------------------------------- */
interface CategoryGroupProps {
  category: string;
  items: ShoppingItem[];
  dimmed?: boolean;
  canEdit: boolean;
}

function CategoryGroup({ category, items, dimmed, canEdit }: CategoryGroupProps) {
  const meta = getCategory(category);
  const { categoryLabel } = useI18n();
  return (
    <section className={`store-group ${dimmed ? 'store-group--dimmed' : ''}`}>
      <header className="store-group__head">
        <h3 className="store-group__name">
          <span className="store-group__icon">
            <CategoryIcon name={meta.icon} size={15} />
          </span>
          {categoryLabel(meta.id)}
        </h3>
        <span className="store-group__count">{items.length}</span>
      </header>
      <ul className="store-group__items">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} canEdit={canEdit} />
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   SectionHeader
   -------------------------------------------------------------------------- */
interface SectionHeaderProps {
  title: string;
  count: number;
  action?: React.ReactNode;
}
function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-header__title">
        <h2>{title}</h2>
        <span className="section-header__count">{count}</span>
      </div>
      {action}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Empty state
   -------------------------------------------------------------------------- */
function EmptyState({ onAdd, onImport, canEdit }: { onAdd: () => void; onImport: () => void; canEdit: boolean }) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <PackageOpen size={36} />
      </div>
      <h2>{t(canEdit ? 'emptyTitle' : 'emptySharedTitle')}</h2>
      <p>{t(canEdit ? 'emptyText' : 'emptyShared')}</p>
      {canEdit && <div className="empty-state__actions">
        <button className="btn-primary" onClick={onAdd}>{t('addFirstShort')}</button>
        <button className="btn-ghost" onClick={onImport}><FileUp size={16} /> {t('importPdf')}</button>
      </div>}
    </div>
  );
}
