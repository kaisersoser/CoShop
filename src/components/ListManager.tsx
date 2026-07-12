import { useEffect, useState } from 'react';
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
  MoreVertical,
} from 'lucide-react';
import {
  useShopStore,
  selectActiveList,
  selectActiveStore,
} from '../store/store';
import { useI18n } from '../i18n';
import { Dialog } from './Dialog';

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [storeDraft, setStoreDraft] = useState(activeStore?.name ?? '');

  useEffect(() => {
    setStoreDraft(activeStore?.name ?? '');
  }, [activeStore?.name, activeListId]);

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

  return (
    <Dialog className="list-manager" onClose={onClose} ariaLabel={t('manageListsDialog')}>
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
                    <div
                      className="list-manager__actions"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenMenuId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape' && openMenuId === l.id) {
                          event.stopPropagation();
                          setOpenMenuId(null);
                        }
                      }}
                    >
                      <button className="icon-btn" onClick={() => setOpenMenuId((id) => id === l.id ? null : l.id)} aria-label={t('listActions', { name: l.name })} aria-expanded={openMenuId === l.id}>
                        <MoreVertical size={18} />
                      </button>
                      {openMenuId === l.id && <div className="list-manager__menu" role="menu">
                        <button role="menuitem" onClick={() => { setEditingId(l.id); setEditName(l.name); setOpenMenuId(null); }}><Pencil size={15} /> {t('rename')}</button>
                        <button role="menuitem" onClick={() => { duplicateList(l.id); setOpenMenuId(null); }}><Copy size={15} /> {t('duplicate')}</button>
                        <button role="menuitem" className="list-manager__delete" onClick={() => { deleteList(l.id); setOpenMenuId(null); }} disabled={!canDelete} title={t(lists.length <= 1 ? 'keepOneList' : !canDelete ? 'ownerDeleteOnly' : 'deleteListTitle')}><Trash2 size={15} /> {t('delete')}</button>
                      </div>}
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
    </Dialog>
  );
}
