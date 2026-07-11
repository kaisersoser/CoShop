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
  Cloud,
  Undo2,
  Share2,
} from 'lucide-react';
import {
  useShopStore,
  selectActiveList,
  selectActiveStore,
  selectCanEditActive,
} from './store/store';
import { ShoppingList } from './components/ShoppingList';
import { CostFooter } from './components/CostFooter';
import { AddItemComposer } from './components/AddItemComposer';
import { ListManager } from './components/ListManager';
import { AccountPanel } from './components/AccountPanel';
import { startCloudSync, syncNow } from './lib/cloudSync';
import { supabase } from './lib/supabase';
import { ShareListPanel } from './components/ShareListPanel';
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
  const hydrated = useShopStore((s) => s.hydrated);
  const latestTrash = useShopStore((s) => s.trash[0]);
  const restoreTrash = useShopStore((s) => s.restoreTrash);
  const dismissTrash = useShopStore((s) => s.dismissTrash);
  const canEdit = useShopStore(selectCanEditActive);

  const [composerOpen, setComposerOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let timer: number | undefined;
    void supabase.auth.getSession().then(({ data }) => void startCloudSync(data.session));
    const auth = supabase.auth.onAuthStateChange((_event, session) => void startCloudSync(session));
    const unsubscribe = useShopStore.subscribe((state, previous) => {
      if (state.lists === previous.lists && state.itemsByList === previous.itemsByList && state.stores === previous.stores && state.trash === previous.trash) return;
      window.clearTimeout(timer); timer = window.setTimeout(() => void syncNow(), 1200);
    });
    const online = () => void syncNow(); window.addEventListener('online', online);
    return () => { window.clearTimeout(timer); unsubscribe(); auth.data.subscription.unsubscribe(); window.removeEventListener('online', online); };
  }, []);

  if (!hydrated || !activeList) return <div className="app-loading" role="status">Loading your lists…</div>;

  return (
    <div className="app-shell">
      <Header
        listName={activeList.name}
        storeName={activeStore?.name}
        budget={activeList.budget}
        currency={activeList.currency}
        onOpenLists={() => setListsOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onShare={() => setShareOpen(true)}
        accessRole={activeList.accessRole}
        onBudgetChange={(budget) => setListBudget(activeList.id, budget)}
      />

      <main className="app-main">
        {!onboardingSeen && canEdit && <Onboarding onAdd={() => setComposerOpen(true)} />}
        <ShoppingList onAdd={() => setComposerOpen(true)} canEdit={canEdit} />
      </main>

      {canEdit && <button
        className={`fab ${composerOpen ? 'fab--hidden' : ''}`}
        aria-label="Add item"
        onClick={() => setComposerOpen(true)}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>}

      {composerOpen && <AddItemComposer onClose={() => setComposerOpen(false)} />}
      {listsOpen && <ListManager onClose={() => setListsOpen(false)} />}
      {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
      {shareOpen && <ShareListPanel list={activeList} onClose={() => setShareOpen(false)} />}

      {latestTrash && (
        <div className="undo-toast" role="status">
          <span>Removed {latestTrash.label}</span>
          <button onClick={() => restoreTrash(latestTrash.id)}><Undo2 size={15} /> Undo</button>
          <button className="icon-btn" onClick={() => dismissTrash(latestTrash.id)} aria-label="Dismiss undo"><X size={15} /></button>
        </div>
      )}

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
  currency: string;
  onOpenLists: () => void;
  onOpenAccount: () => void;
  onShare: () => void;
  accessRole?: 'owner' | 'editor' | 'viewer';
  onBudgetChange: (budget: number | undefined) => void;
}

function Header({ listName, storeName, budget, currency, accessRole, onOpenLists, onOpenAccount, onShare, onBudgetChange }: HeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draftBudget, setDraftBudget] = useState(budget !== undefined ? String(budget) : '');

  useEffect(() => {
    setDraftBudget(budget !== undefined ? String(budget) : '');
  }, [budget]);

  const commit = () => {
    const parsed = parseFloat(draftBudget);
    onBudgetChange(draftBudget.trim() === '' ? undefined : !Number.isNaN(parsed) && parsed >= 0 ? parsed : undefined);
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
          <button className="icon-btn" aria-label="Share current list" onClick={onShare}><Share2 size={16} /></button>
          <button className="icon-btn" aria-label="Backup, account, and sharing" onClick={onOpenAccount}><Cloud size={16} /></button>
          <button
            className="btn-ghost app-header__lists-btn"
            onClick={onOpenLists}
            aria-label="Switch or manage lists"
          >
            <ListChecks size={16} /> Lists
          </button>
          {accessRole !== 'viewer' && <button
            className="icon-btn"
            aria-label="Edit budget"
            onClick={() => setEditing((e) => !e)}
          >
            <Pencil size={16} />
          </button>}
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
                Budget · {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(budget)}
              </span>
            )}
            {accessRole === 'viewer' && <span className="chip">View only</span>}
          </div>
        </div>
      )}
    </header>
  );
}

/* ----------------------------------------------------------------------------
   Onboarding — concise, dismissible first-run coachmark focused on adding.
   -------------------------------------------------------------------------- */
function Onboarding({ onAdd }: { onAdd: () => void }) {
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
      <button className="btn-primary onboarding__cta" onClick={onAdd}>
        Add my first item
      </button>
    </div>
  );
}
