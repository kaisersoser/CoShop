import { useEffect, useState } from 'react';
import {
  Plus,
  Wallet,
  Pencil,
  Check,
  Sparkles,
  ListChecks,
  Store as StoreIcon,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  useShopStore,
  selectActiveList,
  selectActiveStore,
} from './store/store';
import { ShoppingList } from './components/ShoppingList';
import { CostFooter } from './components/CostFooter';
import { AddItemComposer } from './components/AddItemComposer';
import { ListManager } from './components/ListManager';
import './App.css';

/* ============================================================================
   CoShop — App Container
   ----------------------------------------------------------------------------
   Header (active list name, store tag, budget), the list manager + add-item
   composer entry points, the category-grouped ShoppingList, the floating
   CostFooter, and a dismissible first-run onboarding coachmark.
   ========================================================================== */

export default function App() {
  const activeList = useShopStore(selectActiveList);
  const activeStore = useShopStore(selectActiveStore);
  const setListBudget = useShopStore((s) => s.setListBudget);
  const onboardingSeen = useShopStore((s) => s.onboardingSeen);

  const [composerOpen, setComposerOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);

  if (!activeList) return null; // store always seeds at least one list

  return (
    <div className="app-shell">
      <Header
        listName={activeList.name}
        storeName={activeStore?.name}
        budget={activeList.budget}
        onOpenLists={() => setListsOpen(true)}
        onBudgetChange={(budget) => setListBudget(activeList.id, budget)}
      />

      <main className="app-main">
        {!onboardingSeen && <Onboarding />}
        <ShoppingList />
      </main>

      <button
        className={`fab ${composerOpen ? 'fab--hidden' : ''}`}
        aria-label="Add item"
        onClick={() => setComposerOpen(true)}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {composerOpen && <AddItemComposer onClose={() => setComposerOpen(false)} />}
      {listsOpen && <ListManager onClose={() => setListsOpen(false)} />}

      <CostFooter />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Header
   -------------------------------------------------------------------------- */
interface HeaderProps {
  listName: string;
  storeName?: string;
  budget?: number;
  onOpenLists: () => void;
  onBudgetChange: (budget: number) => void;
}

function Header({ listName, storeName, budget, onOpenLists, onBudgetChange }: HeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draftBudget, setDraftBudget] = useState(budget !== undefined ? String(budget) : '');

  useEffect(() => {
    setDraftBudget(budget !== undefined ? String(budget) : '');
  }, [budget]);

  const commit = () => {
    const parsed = parseFloat(draftBudget);
    onBudgetChange(!Number.isNaN(parsed) && parsed >= 0 ? parsed : 0);
    setEditing(false);
  };

  return (
    <header className="app-header glass-strong">
      <div className="app-header__top">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <Sparkles size={18} strokeWidth={2.4} />
          </div>
          <span className="app-header__brand-text">CoShop</span>
        </div>
        <div className="app-header__top-actions">
          <button
            className="btn-ghost app-header__lists-btn"
            onClick={onOpenLists}
            aria-label="Switch or manage lists"
          >
            <ListChecks size={16} /> Lists
          </button>
          <button
            className="icon-btn"
            aria-label="Edit budget"
            onClick={() => setEditing((e) => !e)}
          >
            <Pencil size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="app-header__edit">
          <div className="app-header__budget-input">
            <Wallet size={16} />
            <input
              className="field"
              type="number"
              min="0"
              step="1"
              value={draftBudget}
              onChange={(e) => setDraftBudget(e.target.value)}
              placeholder="Budget (optional)"
              aria-label="Budget"
              onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
          </div>
          <button className="btn-primary" onClick={commit}>
            <Check size={16} /> Save
          </button>
        </div>
      ) : (
        <div className="app-header__meta">
          <button className="app-header__list-switch" onClick={onOpenLists}>
            <h1 className="app-header__week">{listName}</h1>
            <ChevronDown size={20} className="app-header__list-chevron" />
          </button>
          <div className="app-header__tags">
            {storeName && (
              <span className="chip app-header__store-chip">
                <StoreIcon size={12} /> {storeName}
              </span>
            )}
            {budget !== undefined && budget > 0 && (
              <span className="app-header__budget">
                <Wallet size={14} />
                Budget · ${budget.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ----------------------------------------------------------------------------
   Onboarding — concise, dismissible first-run coachmark focused on adding.
   -------------------------------------------------------------------------- */
function Onboarding() {
  const dismiss = useShopStore((s) => s.dismissOnboarding);
  return (
    <div className="onboarding glass" role="note">
      <button className="onboarding__close icon-btn" onClick={dismiss} aria-label="Dismiss">
        <X size={16} />
      </button>
      <div className="onboarding__icon">
        <Sparkles size={20} />
      </div>
      <h2 className="onboarding__title">Welcome to CoShop</h2>
      <p className="onboarding__text">
        Tap the <strong>+</strong> button to add your first item. Search the catalog or just type —
        we’ll file it under the right aisle automatically.
      </p>
      <button className="btn-primary onboarding__cta" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
