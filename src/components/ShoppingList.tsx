import { useMemo } from 'react';
import { useShopStore, selectActiveItems } from '../store/store';
import type { ShoppingItem } from '../store/store';
import { getCategory, categoryOrder } from '../data/categories';
import { ItemRow } from './ItemRow';
import { CategoryIcon } from './categoryIcon';
import { CheckCircle2, PackageOpen, Trash2 } from 'lucide-react';
import './ShoppingList.css';

/* ============================================================================
   ShoppingList — groups items by product CATEGORY and splits by purchase
   state. The "Other" bucket always sorts last.
   ========================================================================== */

/** Distinct category ids present in a set of items, in display order. */
const orderedCategories = (buckets: Record<string, ShoppingItem[]>): string[] =>
  Object.keys(buckets).sort((a, b) => categoryOrder(a) - categoryOrder(b));

export function ShoppingList({ onAdd }: { onAdd: () => void }) {
  const items = useShopStore(selectActiveItems);
  const clearPurchased = useShopStore((s) => s.clearPurchased);

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
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div className="shopping-list">
      <div className="shopping-progress glass" role="status" aria-label={`${purchasedCount} of ${items.length} items purchased`}>
        <div><span>Shopping progress</span><strong>{purchasedCount} of {items.length}</strong></div>
        <div className="shopping-progress__track" aria-hidden="true"><span style={{ width: `${Math.round((purchasedCount / items.length) * 100)}%` }} /></div>
      </div>
      {/* Pending section */}
      <SectionHeader icon={<PackageOpen size={16} />} title="Pending" count={pendingCount} />
      <div className="shopping-list__groups">
        {orderedCategories(pendingByCat).map((cat) => (
          <CategoryGroup key={`p-${cat}`} category={cat} items={pendingByCat[cat]} />
        ))}
      </div>

      {pendingCount === 0 && (
        <div className="shopping-list__all-done glass">
          <CheckCircle2 size={28} className="text-grad-svg" />
          <p>All items in cart. Nice shopping!</p>
          <button className="btn-ghost" onClick={onAdd}>Add another item</button>
        </div>
      )}

      {/* Purchased section */}
      {purchasedCount > 0 && (
        <>
          <SectionHeader
            icon={<CheckCircle2 size={16} />}
            title="Purchased"
            count={purchasedCount}
            action={
              <button
                className="btn-ghost shopping-list__clear"
                onClick={clearPurchased}
                aria-label="Clear purchased items"
              >
                <Trash2 size={14} /> Clear
              </button>
            }
          />
          <div className="shopping-list__groups shopping-list__groups--done">
            {orderedCategories(purchasedByCat).map((cat) => (
              <CategoryGroup key={`d-${cat}`} category={cat} items={purchasedByCat[cat]} dimmed />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   CategoryGroup — a labelled glass card containing rows for a single category.
   -------------------------------------------------------------------------- */
interface CategoryGroupProps {
  category: string;
  items: ShoppingItem[];
  dimmed?: boolean;
}

function CategoryGroup({ category, items, dimmed }: CategoryGroupProps) {
  const meta = getCategory(category);
  return (
    <section className={`store-group glass ${dimmed ? 'store-group--dimmed' : ''}`}>
      <header className="store-group__head">
        <h3 className="store-group__name">
          <span className="store-group__icon">
            <CategoryIcon name={meta.icon} size={15} />
          </span>
          {meta.label}
        </h3>
        <span className="store-group__count">{items.length}</span>
      </header>
      <ul className="store-group__items">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   SectionHeader
   -------------------------------------------------------------------------- */
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  action?: React.ReactNode;
}
function SectionHeader({ icon, title, count, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-header__title">
        <span className="section-header__icon">{icon}</span>
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
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state glass">
      <div className="empty-state__icon">
        <PackageOpen size={36} />
      </div>
      <h2>Your list is empty</h2>
      <p>Tap the + button to add your first item. CoShop works offline, so you can shop anywhere.</p>
      <button className="btn-primary" onClick={onAdd}>Add first item</button>
    </div>
  );
}
