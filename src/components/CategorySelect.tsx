import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag, ChevronDown, Check, Plus } from 'lucide-react';
import { CategoryIcon } from './categoryIcon';
import { useI18n } from '../i18n';
import { useShopStore } from '../store/store';
import { useListCategories } from '../hooks/useListCategories';

/* ============================================================================
   CategorySelect — compact dropdown for re-filing an item's
   category. Renders the menu in a portal positioned from the trigger rect, so
   it never clips inside the scrollable list or behind the fixed cost footer.
   ========================================================================== */

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
}

const MENU_W = 200;
const ROW_H = 38;

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { categories, categoryFor, labelFor } = useListCategories();
  const createCustomCategory = useShopStore((state) => state.createCustomCategory);
  const current = categoryFor(value);
  const { t } = useI18n();

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuH = Math.min(categories.length * ROW_H + 64, 360);
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < menuH + 12 && r.top > menuH;
    let left = r.left;
    if (left + MENU_W > window.innerWidth - 8) left = window.innerWidth - MENU_W - 8;
    setCoords({
      top: above ? r.top - menuH - 6 : r.bottom + 6,
      left: Math.max(8, left),
      above,
    });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open, categories.length]);

  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);

  const focusOption = (index: number) => window.requestAnimationFrame(() => {
    const options = menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!options?.length) return;
    options[Math.max(0, Math.min(index, options.length - 1))]?.focus();
  });

  const stopCreating = () => {
    setCreating(false); setCategoryName(''); setError('');
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('.category-menu__create')?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      if (creating) stopCreating();
      else { setOpen(false); triggerRef.current?.focus(); }
    };
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open, creating]);

  const createCategory = () => {
    const clean = categoryName.trim();
    if (!clean) { setError(t('categoryNameRequired')); return; }
    const duplicate = categories.some((category) => labelFor(category.id).localeCompare(clean, undefined, { sensitivity: 'accent' }) === 0);
    if (duplicate) { setError(t('categoryNameExists')); return; }
    const id = createCustomCategory(clean);
    if (!id) { setError(t('categoryCreateFailed')); return; }
    onChange(id); setOpen(false); setCreating(false); setCategoryName(''); setError(''); triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`category-select ${open ? 'category-select--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault(); setOpen(true); focusOption(event.key === 'ArrowDown' ? 0 : categories.length - 1);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('categoryAria', { category: labelFor(current.id) })}
      >
        <Tag size={12} />
        <span className="category-select__label">{labelFor(current.id)}</span>
        <ChevronDown size={12} className="category-select__chevron" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="category-menu"
            data-dialog-popover="true"
            style={{ top: coords.top, left: coords.left, width: MENU_W }}
          >
            <div role="listbox" aria-label={t('category')}>
            {categories.map((c) => {
              const selected = c.id === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  id={`category-option-${c.id}`}
                  aria-selected={selected}
                  className={`category-menu__item ${selected ? 'category-menu__item--selected' : ''}`}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onKeyDown={(event) => {
                    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const index = categories.findIndex((category) => category.id === c.id);
                    focusOption(event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1));
                  }}
                >
                  <span className="category-menu__icon">
                    <CategoryIcon name={c.icon} size={14} />
                  </span>
                  <span className="category-menu__label">{labelFor(c.id)}</span>
                  {selected && <Check size={14} className="category-menu__check" />}
                </button>
              );
            })}
            </div>
            {creating ? <form className="category-menu__create-form" onSubmit={(event) => { event.preventDefault(); createCategory(); }}>
              <label htmlFor="new-category-name">{t('newCategoryName')}</label>
              <input ref={inputRef} id="new-category-name" className="field" value={categoryName} maxLength={40} onChange={(event) => { setCategoryName(event.target.value); setError(''); }} />
              {error && <span className="field-error" role="alert">{error}</span>}
              <div><button type="button" className="btn-ghost" onClick={stopCreating}>{t('cancel')}</button><button type="submit" className="btn-primary">{t('create')}</button></div>
            </form> : <button type="button" className="category-menu__create" onClick={() => setCreating(true)}><Plus size={14} /> {t('createCategory')}</button>}
          </div>,
          document.body,
        )}
    </>
  );
}
