import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Tags, Trash2 } from 'lucide-react';
import { activeCustomCategories } from '../data/categories';
import { useListCategories } from '../hooks/useListCategories';
import { selectActiveItems, selectActiveList, useShopStore, type CustomCategory } from '../store/store';
import { useI18n } from '../i18n';

export function CategorySettings() {
  const activeList = useShopStore(selectActiveList);
  const items = useShopStore(selectActiveItems);
  const createCategory = useShopStore((state) => state.createCustomCategory);
  const customCategories = activeCustomCategories(useShopStore((state) => state.customCategoriesByList[state.activeListId] ?? []));
  const { categories, labelFor } = useListCategories();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const canEdit = activeList?.accessRole !== 'viewer';

  const create = () => {
    const clean = name.trim();
    if (!clean) { setError(t('categoryNameRequired')); return; }
    if (categories.some((category) => labelFor(category.id).localeCompare(clean, undefined, { sensitivity: 'accent' }) === 0)) { setError(t('categoryNameExists')); return; }
    if (!createCategory(clean)) { setError(t('categoryCreateFailed')); return; }
    setName(''); setError('');
  };

  return <section className="settings-section" aria-labelledby="categories-heading">
    <div className="settings-section__heading"><Tags size={17} /><div><h4 id="categories-heading">{t('customCategories')}</h4><p>{t(canEdit ? 'customCategoriesHelp' : 'customCategoriesViewerHelp')}</p></div></div>
    {canEdit && <form className="category-settings__create" onSubmit={(event) => { event.preventDefault(); create(); }}>
      <label htmlFor="settings-category-name">{t('newCategoryName')}</label>
      <div><input id="settings-category-name" className="field" value={name} maxLength={40} placeholder={t('categoryNameExample')} onChange={(event) => { setName(event.target.value); setError(''); }} /><button className="btn-primary" type="submit"><Plus size={15} /> {t('create')}</button></div>
      {error && <span className="field-error" role="alert">{error}</span>}
    </form>}
    {customCategories.length ? <ul className="category-settings__list">{customCategories.map((category, index) => <CategoryRow key={category.id} category={category} index={index} total={customCategories.length} itemCount={items.filter((item) => item.category === category.id).length} canEdit={canEdit} />)}</ul> : <p className="category-settings__empty">{t('noCustomCategories')}</p>}
  </section>;
}

function CategoryRow({ category, index, total, itemCount, canEdit }: { category: CustomCategory; index: number; total: number; itemCount: number; canEdit: boolean }) {
  const rename = useShopStore((state) => state.renameCustomCategory);
  const move = useShopStore((state) => state.moveCustomCategory);
  const remove = useShopStore((state) => state.deleteCustomCategory);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const { t } = useI18n();

  const save = () => {
    if (name.trim() === category.name) return;
    if (!rename(category.id, name)) { setError(name.trim() ? t('categoryNameExists') : t('categoryNameRequired')); return; }
    setError('');
  };

  return <li className="category-settings__row">
    <div className="category-settings__row-main">
      <div className="category-settings__name">
        {canEdit ? <input className="field" value={name} maxLength={40} aria-label={t('renameCategory', { name: category.name })} onChange={(event) => { setName(event.target.value); setError(''); }} onBlur={save} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save(); event.currentTarget.blur(); } if (event.key === 'Escape') { setName(category.name); setError(''); event.currentTarget.blur(); } }} /> : <strong>{category.name}</strong>}
        <span>{t('categoryItemCount', { count: itemCount })}</span>
        {error && <span className="field-error" role="alert">{error}</span>}
      </div>
      {canEdit && <div className="category-settings__actions">
        <button className="icon-btn" disabled={index === 0} onClick={() => move(category.id, -1)} aria-label={t('moveCategoryUp', { name: category.name })}><ChevronUp size={16} /></button>
        <button className="icon-btn" disabled={index === total - 1} onClick={() => move(category.id, 1)} aria-label={t('moveCategoryDown', { name: category.name })}><ChevronDown size={16} /></button>
        <button className="icon-btn icon-btn--danger" onClick={() => setConfirming(true)} aria-label={t('deleteCategory', { name: category.name })}><Trash2 size={16} /></button>
      </div>}
    </div>
    {confirming && <div className="category-settings__confirm" role="alert"><p>{t(itemCount ? 'deleteCategoryWithItems' : 'deleteCategoryEmpty', { name: category.name, count: itemCount })}</p><div><button className="btn-ghost" onClick={() => setConfirming(false)}>{t('cancel')}</button><button className="btn-danger" onClick={() => remove(category.id)}>{t('delete')}</button></div></div>}
  </li>;
}
