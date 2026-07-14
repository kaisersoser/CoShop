import { beforeEach, describe, expect, it } from 'vitest';
import { selectEstimatedTotal, selectPriceCoverage, useShopStore } from '../src/store/store';
import { defaultListName, REGION_DEFAULTS } from '../src/data/preferences';
import { categoryKey, translate } from '../src/i18n';

const reset = () => {
  const listId = 'test-list';
  useShopStore.setState({
    lists: [{ id: listId, name: 'Test', currency: 'USD', createdAt: 1, updatedAt: 1 }],
    itemsByList: { [listId]: [] }, stores: [], trash: [], categoryPreferences: {}, customCategoriesByList: { [listId]: [] },
    activeListId: listId, onboardingSeen: false, hydrated: true,
    preferences: { region: 'US', language: 'en', defaultCurrency: 'USD' },
  });
};

describe('shopping state', () => {
  beforeEach(reset);
  it('preserves free-text item names and defaults quantity safely', () => {
    useShopStore.getState().addItem({ name: 'My exact oat milk' });
    const item = useShopStore.getState().itemsByList['test-list'][0];
    expect(item.name).toBe('My exact oat milk');
    expect(item.quantity).toBe(1);
    expect(useShopStore.getState().onboardingSeen).toBe(true);
  });
  it('reports incomplete price coverage instead of implying a complete estimate', () => {
    useShopStore.getState().addItem({ name: 'Apples', price: 2, quantity: 2 });
    useShopStore.getState().addItem({ name: 'Bread' });
    expect(selectEstimatedTotal(useShopStore.getState())).toBe(4);
    expect(selectPriceCoverage(useShopStore.getState())).toEqual({ priced: 1, total: 2, missing: 1 });
  });
  it('restores a removed item without changing its identity', () => {
    useShopStore.getState().addItem({ name: 'Bananas' });
    const id = useShopStore.getState().itemsByList['test-list'][0].id;
    useShopStore.getState().deleteItem(id);
    expect(useShopStore.getState().itemsByList['test-list']).toHaveLength(0);
    useShopStore.getState().restoreTrash();
    expect(useShopStore.getState().itemsByList['test-list'][0].id).toBe(id);
  });
  it('does not mutate a view-only shared list', () => {
    useShopStore.setState((state) => ({ lists: state.lists.map((list) => ({ ...list, accessRole: 'viewer' as const, remoteHouseholdId: 'remote-household' })) }));
    useShopStore.getState().addItem({ name: 'Should not be added' });
    expect(useShopStore.getState().itemsByList['test-list']).toHaveLength(0);
    useShopStore.getState().setListBudget('test-list', 50);
    expect(useShopStore.getState().lists[0].budget).toBeUndefined();
  });
  it('uses the configured currency for new lists', () => {
    useShopStore.getState().updatePreferences({ region: 'FR', defaultCurrency: 'EUR' });
    const id = useShopStore.getState().createList('Paris groceries');
    expect(useShopStore.getState().lists.find((list) => list.id === id)?.currency).toBe('EUR');
  });
  it('creates, renames, and reorders list-specific custom categories', () => {
    const first = useShopStore.getState().createCustomCategory('Farmers market');
    const second = useShopStore.getState().createCustomCategory('Bulk shop');
    expect(first).toBeTruthy(); expect(second).toBeTruthy();
    expect(useShopStore.getState().renameCustomCategory(first!, 'Market stalls')).toBe(true);
    useShopStore.getState().moveCustomCategory(second!, -1);
    const categories = useShopStore.getState().customCategoriesByList['test-list'].filter((category) => !category.deletedAt).sort((a, b) => a.order - b.order);
    expect(categories.map((category) => category.name)).toEqual(['Bulk shop', 'Market stalls']);
  });
  it('moves affected items to Uncategorized when deleting a category and restores both with undo', () => {
    const category = useShopStore.getState().createCustomCategory('Market')!;
    useShopStore.getState().addItem({ name: 'Local honey', category });
    const item = useShopStore.getState().itemsByList['test-list'][0];
    useShopStore.getState().setItemCategory(item.id, category);
    useShopStore.getState().deleteCustomCategory(category);
    expect(useShopStore.getState().itemsByList['test-list'][0].category).toBe('other');
    expect(useShopStore.getState().customCategoriesByList['test-list'][0].deletedAt).toBeTypeOf('number');
    useShopStore.getState().restoreTrash();
    expect(useShopStore.getState().itemsByList['test-list'][0].category).toBe(category);
    expect(useShopStore.getState().customCategoriesByList['test-list'][0].deletedAt).toBeUndefined();
  });
  it('does not let viewers manage custom categories', () => {
    useShopStore.setState((state) => ({ lists: state.lists.map((list) => ({ ...list, accessRole: 'viewer' as const, remoteHouseholdId: 'remote-household' })) }));
    expect(useShopStore.getState().createCustomCategory('Private aisle')).toBeUndefined();
    expect(useShopStore.getState().customCategoriesByList['test-list']).toEqual([]);
  });
  it('does not leak a custom category preference into another list', () => {
    const category = useShopStore.getState().createCustomCategory('Market')!;
    useShopStore.getState().addItem({ name: 'Local honey' });
    const item = useShopStore.getState().itemsByList['test-list'][0];
    useShopStore.getState().setItemCategory(item.id, category);
    const otherList = useShopStore.getState().createList('Other shop');
    useShopStore.getState().addItem({ name: 'Local honey' });
    expect(useShopStore.getState().itemsByList[otherList][0].category).not.toBe(category);
  });
  it('defines language and currency defaults for the first four European markets', () => {
    expect(REGION_DEFAULTS).toMatchObject({
      GB: { language: 'en', currency: 'GBP' },
      FR: { language: 'fr', currency: 'EUR' },
      DE: { language: 'de', currency: 'EUR' },
      ES: { language: 'es', currency: 'EUR' },
    });
  });
  it('maps every selectable region to its currency', () => {
    expect(Object.fromEntries(Object.entries(REGION_DEFAULTS).map(([region, defaults]) => [region, defaults.currency]))).toEqual({
      US: 'USD', CA: 'CAD', GB: 'GBP', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR',
      CH: 'CHF', AU: 'AUD', NZ: 'NZD', JP: 'JPY',
    });
  });
  it('translates interface copy and category labels with an English fallback', () => {
    expect(translate('fr', 'settings')).toBe('Paramètres');
    expect(translate('de', categoryKey('produce-veg'))).toBe('Gemüse');
    expect(translate('es', 'welcome')).toBe('Te damos la bienvenida a CoShop');
    expect(translate('unknown', 'settings')).toBe('Settings');
  });
  it('creates localized default list names', () => {
    const date = new Date(2026, 6, 11);
    expect(defaultListName('fr', 'FR', date)).toMatch(/^Courses du /);
    expect(defaultListName('de', 'DE', date)).toMatch(/^Einkauf /);
    expect(defaultListName('es', 'ES', date)).toMatch(/^Compra del /);
  });
  it('imports a complete list atomically with its retailer and currency', () => {
    const id = useShopStore.getState().importList({
      name: 'Carrefour · 2026-06-20', currency: 'EUR', storeName: 'Carrefour',
      items: [{ name: 'Bananas', catalogId: 'ean:3276558440996', category: 'produce-fruit', quantity: 2, price: 0.99 }],
    });
    const state = useShopStore.getState();
    expect(state.activeListId).toBe(id);
    expect(state.lists.find((list) => list.id === id)).toMatchObject({ name: 'Carrefour · 2026-06-20', currency: 'EUR' });
    expect(state.itemsByList[id][0]).toMatchObject({ name: 'Bananas', catalogId: 'ean:3276558440996', quantity: 2, price: 0.99, isPurchased: false });
    expect(state.stores.find((store) => store.name === 'Carrefour')).toBeTruthy();
  });
});
