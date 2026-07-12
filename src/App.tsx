import { useEffect, useState } from 'react';
import {
  Plus,
  Wallet,
  Check,
  ShoppingBasket,
  Store as StoreIcon,
  ChevronDown,
  X,
  Undo2,
  Share2,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  useShopStore,
  selectActiveList,
  selectActiveStore,
  selectCanEditActive,
  selectActiveItems,
} from './store/store';
import { ShoppingList } from './components/ShoppingList';
import { CostFooter } from './components/CostFooter';
import { AddItemComposer } from './components/AddItemComposer';
import { ListManager } from './components/ListManager';
import { SettingsPanel } from './components/SettingsPanel';
import { startCloudSync, syncNow } from './lib/cloudSync';
import { supabase } from './lib/supabase';
import { ShareListPanel } from './components/ShareListPanel';
import { ImportPdfPanel } from './components/ImportPdfPanel';
import { useI18n } from './i18n';
import './App.css';

/* ============================================================================
   CoShop — App Container
   ----------------------------------------------------------------------------
   Header (active list name, store tag, budget), the list manager + add-item
   composer entry points, the category-grouped ShoppingList, and the compact
   honest-total action dock.
   ========================================================================== */

export default function App() {
  const activeList = useShopStore(selectActiveList);
  const activeStore = useShopStore(selectActiveStore);
  const setListBudget = useShopStore((s) => s.setListBudget);
  const hydrated = useShopStore((s) => s.hydrated);
  const latestTrash = useShopStore((s) => s.trash[0]);
  const restoreTrash = useShopStore((s) => s.restoreTrash);
  const dismissTrash = useShopStore((s) => s.dismissTrash);
  const canEdit = useShopStore(selectCanEditActive);
  const activeItems = useShopStore(selectActiveItems);
  const { language, t } = useI18n();

  const [composerOpen, setComposerOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  if (!hydrated || !activeList) return <div className="app-loading" role="status">{t('loading')}</div>;

  return (
    <div className="app-shell">
      <Header
        listName={activeList.name}
        storeName={activeStore?.name}
        budget={activeList.budget}
        currency={activeList.currency}
        onOpenLists={() => setListsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onShare={() => setShareOpen(true)}
        accessRole={activeList.accessRole}
        onBudgetChange={(budget) => setListBudget(activeList.id, budget)}
      />

      <main className="app-main">
        <ShoppingList onAdd={() => setComposerOpen(true)} onImport={() => setImportOpen(true)} canEdit={canEdit} />
      </main>

      {activeItems.length > 0 && <div className="shopping-dock" aria-label={t('shoppingSummary')}>
        <CostFooter />
        {canEdit && <button className="btn-primary shopping-dock__add" onClick={() => setComposerOpen(true)}>
          <Plus size={18} /> {t('addItem')}
        </button>}
      </div>}

      {composerOpen && <AddItemComposer onClose={() => setComposerOpen(false)} />}
      {listsOpen && <ListManager onClose={() => setListsOpen(false)} onImport={() => { setListsOpen(false); setImportOpen(true); }} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {shareOpen && <ShareListPanel list={activeList} onClose={() => setShareOpen(false)} />}
      {importOpen && <ImportPdfPanel onClose={() => setImportOpen(false)} onImported={() => setImportOpen(false)} />}

      {latestTrash && (
        <div className="undo-toast" role="status">
          <span>{t('removed', { name: latestTrash.label })}</span>
          <button onClick={() => restoreTrash(latestTrash.id)}><Undo2 size={15} /> {t('undo')}</button>
          <button className="icon-btn" onClick={() => dismissTrash(latestTrash.id)} aria-label={t('dismissUndo')}><X size={15} /></button>
        </div>
      )}
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
  onOpenSettings: () => void;
  onShare: () => void;
  accessRole?: 'owner' | 'editor' | 'viewer';
  onBudgetChange: (budget: number | undefined) => void;
}

function Header({ listName, storeName, budget, currency, accessRole, onOpenLists, onOpenSettings, onShare, onBudgetChange }: HeaderProps) {
  const { locale, t } = useI18n();
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
    <header className="app-header">
      <div className="app-header__top">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <ShoppingBasket size={18} strokeWidth={2.2} />
          </div>
          <span className="app-header__brand-text">CoShop</span>
        </div>
        <div className="app-header__top-actions">
          <button className="icon-btn" aria-label={t('shareCurrent')} onClick={onShare}><Share2 size={16} /></button>
          <button className="icon-btn" aria-label={t('openSettings')} onClick={onOpenSettings}><SettingsIcon size={16} /></button>
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
              placeholder={t('budgetOptional')}
              aria-label={t('budget')}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
          </div>
          <button className="btn-primary" onClick={commit}>
            <Check size={16} /> {t('save')}
          </button>
        </div>
      ) : (
        <div className="app-header__meta">
          <button className="app-header__list-switch" onClick={onOpenLists} aria-label={t('manageLists')}>
            <h1 className="app-header__week">{listName}</h1>
            <ChevronDown size={20} className="app-header__list-chevron" />
          </button>
          <div className="app-header__tags">
            {storeName && (
              <span className="app-header__store-chip">
                <StoreIcon size={12} /> {storeName}
              </span>
            )}
            {accessRole !== 'viewer' && <button className="app-header__budget" onClick={() => setEditing(true)}>
                <Wallet size={14} />
                {budget !== undefined && budget > 0 ? `${t('budget')} · ${new Intl.NumberFormat(locale, { style: 'currency', currency }).format(budget)}` : t('setBudget')}
              </button>}
            {accessRole === 'viewer' && <span className="status-badge">{t('viewOnly')}</span>}
          </div>
        </div>
      )}
    </header>
  );
}
