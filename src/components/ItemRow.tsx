import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { useShopStore } from '../store/store';
import { CATEGORIES, OTHER_CATEGORY_ID } from '../data/categories';
import { capabilities } from '../lib/capabilities';
import { loadImage, removeImage, saveImage } from '../lib/media';
import { CategorySelect } from './CategorySelect';
import './ItemRow.css';

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
          aria-label={item.isPurchased ? 'Mark as pending' : 'Mark as purchased'}
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
                ${(item.price as number).toFixed(2)}
                {item.quantity > 1 && <span className="item-row__qty"> × {item.quantity}</span>}
              </span>
            ) : (
              <span className="item-row__qty">Qty {item.quantity}</span>
            )}
            {isOther && canEdit && (
              <CategorySelect
                value={item.category}
                onChange={(c) => setItemCategory(item.id, c)}
              />
            )}
            {lineTotal !== null && (
              <span className="item-row__total">${lineTotal.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!canEdit && photoUrl && <button className="icon-btn item-row__photo item-row__photo--has" onClick={() => setPhotoOpen(true)} aria-label="View photo"><img src={photoUrl} alt="" className="item-row__photo-thumb" /></button>}
        {canEdit && <div className="item-row__actions">
          <button
            className={`icon-btn item-row__photo ${photoUrl ? 'item-row__photo--has' : ''}`}
            onClick={() => setPhotoOpen(true)}
            aria-label={photoUrl ? 'View photo' : 'Add photo'}
            title={photoUrl ? 'View photo' : 'Add photo'}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="item-row__photo-thumb" />
            ) : (
              <ImageIcon size={16} />
            )}
          </button>
          <div className="item-row__menu-wrap">
            <button className="icon-btn" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={`More actions for ${item.name}`}><MoreVertical size={17} /></button>
            {menuOpen && <div className="item-row__menu glass-strong"><button onClick={() => { setEditing(true); setMenuOpen(false); }}><Pencil size={15} /> Edit item</button><button className="item-row__delete" onClick={() => { deleteItem(item.id); setMenuOpen(false); }}><Trash2 size={15} /> Remove item</button></div>}
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
  const [preview, setPreview] = useState<string | undefined>(photoUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = async () => {
    setError(null);
    try {
      const data = await capabilities.camera.pickImage({ camera: true });
      if (data) setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this image.');
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass-strong"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo for ${item.name}`}
      >
        <div className="modal__head">
          <h3>{readOnly ? 'Item Photo' : photoUrl ? 'Item Photo' : 'Add Photo'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="photo-preview">
          {preview ? (
            <img src={preview} alt={item.name} className="photo-preview__img" />
          ) : (
            <div className="photo-preview__empty">
              <Camera size={36} />
              <p>Snap a photo or pick an image to remember the exact brand.</p>
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
            <Camera size={16} /> {photoUrl ? 'Replace' : 'Choose photo'}
          </button>
          {photoUrl && (
            <button className="btn-ghost" onClick={() => void onClear()}>
              <Trash2 size={14} /> Remove
            </button>
          )}
          {preview && preview !== photoUrl && (
            <button className="btn-ghost photo-save" onClick={() => preview && void onSave(preview)}>
              <Check size={16} /> Save photo
            </button>
          )}
        </div>}
      </div>
    </div>,
    document.body,
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
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [price, setPrice] = useState(item.price !== undefined ? String(item.price) : '');
  const [quantity, setQuantity] = useState(String(item.quantity));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    const parsedPrice = price.trim() === '' ? undefined : parseFloat(price);
    onSave({
      name: name.trim() || item.name,
      category,
      price: parsedPrice !== undefined && !Number.isNaN(parsedPrice) ? parsedPrice : undefined,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass-strong"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
      >
        <div className="modal__head">
          <h3>Edit Item</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="composer__label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="composer__label">Category</label>
        <select
          className="field"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="composer__row">
          <div className="composer__field-group">
            <label className="composer__label">Price (optional)</label>
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
            <label className="composer__label">Qty</label>
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
          <Check size={16} /> Save changes
        </button>
      </div>
    </div>,
    document.body,
  );
}
