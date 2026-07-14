import { useMemo } from 'react';
import { categoriesForList, getCategory } from '../data/categories';
import { useI18n } from '../i18n';
import { useShopStore } from '../store/store';

export function useListCategories() {
  const activeListId = useShopStore((state) => state.activeListId);
  const customCategories = useShopStore((state) => state.customCategoriesByList[state.activeListId] ?? []);
  const { categoryLabel } = useI18n();
  return useMemo(() => {
    const categories = categoriesForList(customCategories);
    const labelFor = (id: string) => {
      const category = getCategory(id, customCategories);
      return category.custom ? category.label : categoryLabel(category.id);
    };
    return { activeListId, customCategories, categories, categoryFor: (id: string) => getCategory(id, customCategories), labelFor };
  }, [activeListId, categoryLabel, customCategories]);
}
