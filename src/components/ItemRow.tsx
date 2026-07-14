import { useEffect, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  Trash2,
  Pencil,
  X,
  Camera,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import type { ShoppingItem } from '../store/store';
import { selectActiveList, useShopStore } from '../store/store';
import { OTHER_CATEGORY_ID } from '../data/categories';
import { capabilities } from '../lib/capabilities';
import { loadImage, removeImage, saveImage } from '../lib/media';
import { CategorySelect } from './CategorySelect';
import './ItemRow.css';
import { useI18n } from '../i18n';
import { Dialog } from './Dialog';

/* ============================================================================
   ItemRow — single line in the list.
   Displays name, optional price × quantity, custom checkbox, photo & edit
   actions. "Other" items get an inline category picker to file them.
   ========================================================================== */

interface ItemRowProps {
  item: ShoppingItem;
  canEdit?: boolean;
}

export function ItemRow({ item, canEdit = true }: ItemRowProps) {
  const toggleItemStatus = useShopStore((s) => s.toggleItemStatus);
  const deleteItem = useShopStore((s) => s.deleteItem);
  const updateItem = useShopStore((s) => s.updateItem);
  const setItemCategory = useShopStore((s) => s.setItemCategory);
  const activeList = useShopStore(selectActiveList);
  const { locale, t } = useI18n();

  const [photoOpen, setPhotoOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(item.photoBase64);

  useEffect(() => {
    let active = true; let objectUrl: string | undefined;
    void loadImage(item.photoRef).then((url) => { objectUrl = url; if (active && url) setPhotoUrl(url); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.photoRef]);

  const hasPrice = typeof item.price === 'number';
  const lineTotal = hasPrice ? (item.price as number) * item.quantity : null;
  const isOther = item.category === OTHER_CATEGORY_ID;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: activeList?.currency ?? 'EUR' }).format(value);

  return (
    <>
      <li
        className={`item-row ${item.isPurchased ? 'item-row--done' : ''}`}
        style={{ animationDelay: '0ms' }}
      >
        {/* Custom checkbox */}
        <button
          className={`check ${item.isPurchased ? 'check--on' : ''}`}
          onClick={() => toggleItemStatus(item.id)}
          aria-pressed={item.isPurchased}
          aria-label={t(item.isPurchased ? 'markPending' : 'markPurchased')}
          disabled={!canEdit}
        >
          <Check size={16} strokeWidth={3} className="check__tick" />
        </button>

        {/* Main content */}
        <div className="item-row__body">
          <div className="item-row__top">
            <span className="item-row__name">{item.name}</span>
          </div>
          <div className="item-row__meta">
            {hasPrice ? (
              <span className="item-row__price">
                {money(item.price as number)}
                {item.quantity > 1 && <span className="item-row__qty"> × {item.quantity}</span>}
              </span>
            ) : (
              <span className="item-row__qty">{t('quantity')} {item.quantity}</span>
            )}
            {isOther && canEdit && (
              <CategorySelect
                value={item.category}
                onChange={(c) => setItemCategory(item.id, c)}
              />
            )}
            {lineTotal !== null && (
              <span className="item-row__total">{money(lineTotal)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!canEdit && photoUrl && <button className="icon-btn item-row__photo item-row__photo--has" onClick={() => setPhotoOpen(true)} aria-label={t('viewPhoto')}><img src={photoUrl} alt="" className="item-row__photo-thumb" /></button>}
        {canEdit && <div className="item-row__actions">
          {photoUrl && <button className="icon-btn item-row__photo item-row__photo--has" onClick={() => setPhotoOpen(true)} aria-label={t('viewPhoto')} title={t('viewPhoto')}><img src={photoUrl} alt="" className="item-row__photo-thumb" /></button>}
          <div
            className="item-row__menu-wrap"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && menuOpen) {
                event.stopPropagation();
                setMenuOpen(false);
              }
            }}
          >
            <button className="icon-btn" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={t('moreActions', { name: item.name })}><MoreVertical size={17} /></button>
            {menuOpen && <div className="item-row__menu" role="menu"><button role="menuitem" onClick={() => { setPhotoOpen(true); setMenuOpen(false); }}><ImageIcon size={15} /> {t(photoUrl ? 'viewPhoto' : 'addPhoto')}</button><button role="menuitem" onClick={() => { setEditing(true); setMenuOpen(false); }}><Pencil size={15} /> {t('editItem')}</button><button role="menuitem" className="item-row__delete" onClick={() => { deleteItem(item.id); setMenuOpen(false); }}><Trash2 size={15} /> {t('removeItem')}</button></div>}
          </div>
        </div>}
      </li>

      {photoOpen && (
        <PhotoModal
          item={item}
          photoUrl={photoUrl}
          readOnly={!canEdit}
          onClose={() => setPhotoOpen(false)}
          onSave={async (dataUrl) => {
            const photoRef = await saveImage(dataUrl, item.photoRef);
            updateItem(item.id, { photoRef, photoBase64: undefined });
            setPhotoUrl(dataUrl);
            setPhotoOpen(false);
          }}
          onClear={async () => {
            await removeImage(item.photoRef);
            updateItem(item.id, { photoRef: undefined, photoBase64: undefined });
            setPhotoUrl(undefined);
            setPhotoOpen(false);
          }}
        />
      )}

      {editing && (
        <EditModal
          item={item}
          onClose={() => setEditing(false)}
          onSave={(patch) => {
            updateItem(item.id, patch);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------------------------------
   PhotoModal — view / capture / upload a photo, store as base64.
   Image acquisition is delegated to the capability layer (web today, native
   plugin in a later phase).
   -------------------------------------------------------------------------- */
interface PhotoModalProps {
  item: ShoppingItem;
  photoUrl?: string;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
  onClear: () => Promise<void>;
}

function PhotoModal({ item, photoUrl, readOnly, onClose, onSave, onClear }: PhotoModalProps) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | undefined>(photoUrl);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    try {
      const data = await capabilities.camera.pickImage({ camera: true });
      if (data) setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('imageError'));
    }
  };

  return (
    <Dialog onClose={onClose} ariaLabel={t('photoFor', { name: item.name })}>
        <div className="modal__head">
          <h3>{t(readOnly || photoUrl ? 'itemPhoto' : 'addPhotoTitle')}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>

        <div className="photo-preview">
          {preview ? (
            <img src={preview} alt={item.name} className="photo-preview__img" />
          ) : (
            <div className="photo-preview__empty">
              <Camera size={36} />
              <p>{t('photoHelp')}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="photo-error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!readOnly && <div className="modal__actions">
          <button className="btn-primary" onClick={choose}>
            <Camera size={16} /> {t(photoUrl ? 'replace' : 'choosePhoto')}
          </button>
          {photoUrl && (
            <button className="btn-ghost" onClick={() => void onClear()}>
              <Trash2 size={14} /> {t('remove')}
            </button>
          )}
          {preview && preview !== photoUrl && (
            <button className="btn-ghost photo-save" onClick={() => preview && void onSave(preview)}>
              <Check size={16} /> {t('savePhoto')}
            </button>
          )}
        </div>}
    </Dialog>
  );
}

/* ----------------------------------------------------------------------------
   EditModal — quick edit of name, category, optional price, quantity.
   -------------------------------------------------------------------------- */
interface EditModalProps {
  item: ShoppingItem;
  onClose: () => void;
  onSave: (patch: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>) => void;
}

function EditModal({ item, onClose, onSave }: EditModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [price, setPrice] = useState(item.price !== undefined ? String(item.price) : '');
  const [quantity, setQuantity] = useState(String(item.quantity));

  const submit = () => {
    const parsedPrice = price.trim() === '' ? undefined : parseFloat(price);
    onSave({
      name: name.trim() || item.name,
      category,
      price: parsedPrice !== undefined && !Number.isNaN(parsedPrice) ? parsedPrice : undefined,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
    });
  };

  return (
    <Dialog onClose={onClose} ariaLabel={t('editItem')}>
        <div className="modal__head">
          <h3>{t('editItemTitle')}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>

        <label className="composer__label">{t('name')}</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="composer__label">{t('category')}</label>
        <div className="edit-category-field"><CategorySelect value={category} onChange={setCategory} /></div>

        <div className="composer__row">
          <div className="composer__field-group">
            <label className="composer__label">{t('priceOptional')}</label>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
            />
          </div>
          <div className="composer__field-group">
            <label className="composer__label">{t('quantity')}</label>
            <input
              className="field"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <button className="btn-primary modal__save" onClick={submit}>
          <Check size={16} /> {t('saveChanges')}
        </button>
    </Dialog>
  );
}
