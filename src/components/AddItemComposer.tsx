import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Search, Tag, SlidersHorizontal } from 'lucide-react';
import { useShopStore } from '../store/store';
import { searchCatalog } from '../lib/catalog';
import { resolveItem } from '../lib/categorize';
import { getCategory } from '../data/categories';
import { useI18n } from '../i18n';

/* ============================================================================
   AddItemComposer — bottom-sheet for adding items with catalog autocomplete.
   Typing surfaces ranked catalog suggestions; picking one locks the matched
   product + category. Unmatched text still adds (resolved to "Other").
   ========================================================================== */

interface ComposerProps {
  onClose: () => void;
}

interface Chosen {
  catalogId: string;
  category: string;
}

export function AddItemComposer({ onClose }: ComposerProps) {
  const addItem = useShopStore((s) => s.addItem);
  const { t, categoryLabel } = useI18n();

  const draft = (() => { try { return JSON.parse(sessionStorage.getItem('coshop-item-draft') ?? '{}'); } catch { return {}; } })();
  const [name, setName] = useState<string>(draft.name ?? '');
  const [price, setPrice] = useState<string>(draft.price ?? '');
  const [quantity, setQuantity] = useState<string>(draft.quantity ?? '1');
  const [detailsOpen, setDetailsOpen] = useState(Boolean(draft.price || (draft.quantity && draft.quantity !== '1')));
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('coshop-item-draft', JSON.stringify({ name, price, quantity }));
  }, [name, price, quantity]);

  // Esc closes the composer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const suggestions = useMemo(() => {
    if (chosen || name.trim().length < 1) return [];
    return searchCatalog(name, 6);
  }, [name, chosen]);

  // Category preview chip: the chosen match, else a best-effort resolution.
  const previewCategoryId = useMemo(() => {
    if (chosen) return chosen.category;
    if (!name.trim()) return null;
    return resolveItem(name).category;
  }, [chosen, name]);

  const valid = name.trim().length > 0;

  const onNameChange = (v: string) => {
    setName(v);
    setChosen(null);
    setShowSuggestions(true);
    setHighlight(0);
  };

  const pick = (catalogId: string, productName: string, category: string) => {
    setName(productName);
    setChosen({ catalogId, category });
    setShowSuggestions(false);
    sessionStorage.removeItem('coshop-item-draft');
    nameRef.current?.focus();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedPrice = price.trim() === '' ? undefined : parseFloat(price);
    addItem({
      name: trimmed,
      catalogId: chosen?.catalogId,
      category: chosen?.category,
      price: parsedPrice !== undefined && !Number.isNaN(parsedPrice) ? parsedPrice : undefined,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
    });
    // Reset & keep composer open for rapid entry.
    setName('');
    setPrice('');
    setQuantity('1');
    setChosen(null);
    setShowSuggestions(false);
    nameRef.current?.focus();
  };

  const onNameKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
    }
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  const previewCategory = previewCategoryId ? getCategory(previewCategoryId) : null;

  return (
    <div className="composer-overlay" onClick={onClose}>
      <div
        className="composer glass-strong"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('addItemDialog')}
      >
        <div className="composer__handle" />
        <div className="composer__head">
          <h2>{t('addItemTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={18} />
          </button>
        </div>

        <label className="composer__label">{t('itemName')}</label>
        <div className="composer__autocomplete">
          <div className="composer__search-field">
            <Search size={16} className="composer__search-icon" />
            <input
              ref={nameRef}
              className="field composer__search-input"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onFocus={() => !chosen && setShowSuggestions(true)}
              placeholder={t('searchProducts')}
              onKeyDown={onNameKeyDown}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="item-suggestions"
            />
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <ul id="item-suggestions" className="autocomplete-list glass" role="listbox">
              {suggestions.map((s, i) => {
                const cat = getCategory(s.product.category);
                return (
                  <li key={s.product.id} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      className={`autocomplete-item ${i === highlight ? 'autocomplete-item--active' : ''}`}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => pick(s.product.id, s.product.name, s.product.category)}
                    >
                      <span className="autocomplete-item__name">{s.product.name}</span>
                      <span className="autocomplete-item__cat">{categoryLabel(cat.id)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {previewCategory && (
          <div className="composer__category-preview">
            <Tag size={13} />
            <span>
              {t('filedUnder', { category: categoryLabel(previewCategory.id) })}
            </span>
          </div>
        )}

        <button type="button" className="btn-ghost composer__details-toggle" onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen}><SlidersHorizontal size={15} /> {t(detailsOpen ? 'hideDetails' : 'addPriceQuantity')}</button>
        {detailsOpen && <div className="composer__row">
          <div className="composer__field-group">
            <label className="composer__label">{t('unitPrice')}</label>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="—"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
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
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
        </div>}

        <button
          className="btn-primary composer__submit"
          onClick={submit}
          disabled={!valid}
        >
          <Plus size={18} /> {t('addToList')}
        </button>
      </div>
    </div>
  );
}
