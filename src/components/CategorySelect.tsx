import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag, ChevronDown, Check } from 'lucide-react';
import { CATEGORIES, getCategory } from '../data/categories';
import { CategoryIcon } from './categoryIcon';
import { useI18n } from '../i18n';

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
  const [coords, setCoords] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = getCategory(value);
  const { t, categoryLabel } = useI18n();

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuH = Math.min(CATEGORIES.length * ROW_H + 8, 300);
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => place();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
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
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`category-select ${open ? 'category-select--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('categoryAria', { category: categoryLabel(current.id) })}
      >
        <Tag size={12} />
        <span className="category-select__label">{categoryLabel(current.id)}</span>
        <ChevronDown size={12} className="category-select__chevron" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="category-menu"
            role="listbox"
            style={{ top: coords.top, left: coords.left, width: MENU_W }}
          >
            {CATEGORIES.map((c) => {
              const selected = c.id === value;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`category-menu__item ${selected ? 'category-menu__item--selected' : ''}`}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <span className="category-menu__icon">
                    <CategoryIcon name={c.icon} size={14} />
                  </span>
                  <span className="category-menu__label">{categoryLabel(c.id)}</span>
                  {selected && <Check size={14} className="category-menu__check" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
