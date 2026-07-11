import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Check,
  Pencil,
  Copy,
  Trash2,
  Store as StoreIcon,
  ListChecks,
  FileUp,
} from 'lucide-react';
import {
  useShopStore,
  selectActiveList,
  selectActiveStore,
} from '../store/store';
import { useI18n } from '../i18n';

/* ============================================================================
   ListManager — create / name / switch / duplicate / delete lists, and tag
   the active list with an optional store/location.
   ========================================================================== */

interface ListManagerProps {
  onClose: () => void;
  onImport: () => void;
}

export function ListManager({ onClose, onImport }: ListManagerProps) {
  const lists = useShopStore((s) => s.lists);
  const itemsByList = useShopStore((s) => s.itemsByList);
  const activeListId = useShopStore((s) => s.activeListId);
  const activeList = useShopStore(selectActiveList);
  const activeStore = useShopStore(selectActiveStore);

  const createList = useShopStore((s) => s.createList);
  const renameList = useShopStore((s) => s.renameList);
  const duplicateList = useShopStore((s) => s.duplicateList);
  const deleteList = useShopStore((s) => s.deleteList);
  const setActiveList = useShopStore((s) => s.setActiveList);
  const setListStore = useShopStore((s) => s.setListStore);
  const { t } = useI18n();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [storeDraft, setStoreDraft] = useState(activeStore?.name ?? '');

  useEffect(() => {
    setStoreDraft(activeStore?.name ?? '');
  }, [activeStore?.name, activeListId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const create = () => {
    createList(newName);
    setNewName('');
  };

  const commitRename = (id: string) => {
    renameList(id, editName);
    setEditingId(null);
  };

  const commitStore = () => {
    const trimmed = storeDraft.trim();
    if (!activeList) return;
    setListStore(activeList.id, trimmed ? { name: trimmed } : null);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass-strong list-manager"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('manageListsDialog')}
      >
        <div className="modal__head">
          <h3>
            <ListChecks size={18} /> {t('yourLists')}
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>

        {/* Existing lists */}
        <ul className="list-manager__lists">
          {lists.map((l) => {
            const count = itemsByList[l.id]?.length ?? 0;
            const isActive = l.id === activeListId;
            const isEditing = editingId === l.id;
            const canDelete = lists.length > 1 && (!l.remoteHouseholdId || l.accessRole === 'owner');
            return (
              <li
                key={l.id}
                className={`list-manager__row ${isActive ? 'list-manager__row--active' : ''}`}
              >
                {isEditing ? (
                  <div className="list-manager__edit">
                    <input
                      className="field"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitRename(l.id)}
                      aria-label={t('listName')}
                    />
                    <button
                      className="icon-btn"
                      onClick={() => commitRename(l.id)}
                      aria-label={t('saveName')}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="list-manager__select"
                      onClick={() => {
                        setActiveList(l.id);
                        onClose();
                      }}
                    >
                      <span className="list-manager__name">{l.name}</span>
                      <span className="list-manager__count">{count}</span>
                    </button>
                    <div className="list-manager__actions">
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setEditingId(l.id);
                          setEditName(l.name);
                        }}
                        aria-label={t('renameList', { name: l.name })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => duplicateList(l.id)}
                        aria-label={t('duplicateList', { name: l.name })}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="icon-btn list-manager__delete"
                        onClick={() => deleteList(l.id)}
                        disabled={!canDelete}
                        aria-label={t('deleteList', { name: l.name })}
                        title={t(lists.length <= 1 ? 'keepOneList' : !canDelete ? 'ownerDeleteOnly' : 'deleteListTitle')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {/* Create new list */}
        <div className="list-manager__create">
          <input
            className="field"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('newListName')}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            aria-label={t('newListNameAria')}
          />
          <button className="btn-primary" onClick={create}>
            <Plus size={16} /> {t('new')}
          </button>
        </div>
        <button className="btn-ghost list-manager__import" onClick={onImport}><FileUp size={16} /> {t('importPdf')}</button>

        {/* Store tag for the active list */}
        {activeList && (
          <div className="list-manager__store">
            <label className="composer__label">
              <StoreIcon size={13} /> {t('storeFor', { name: activeList.name })}
            </label>
            <div className="list-manager__store-row">
              <input
                className="field"
                value={storeDraft}
                onChange={(e) => setStoreDraft(e.target.value)}
                placeholder={t('storeExample')}
                onKeyDown={(e) => e.key === 'Enter' && commitStore()}
                aria-label={t('storeName')}
              />
              <button className="btn-ghost" onClick={commitStore}>
                <Check size={15} /> {t('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
