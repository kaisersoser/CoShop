import { beforeEach, describe, expect, it } from 'vitest';
import { selectEstimatedTotal, selectPriceCoverage, useShopStore } from '../src/store/store';

const reset = () => {
  const listId = 'test-list';
  useShopStore.setState({
    lists: [{ id: listId, name: 'Test', currency: 'USD', createdAt: 1, updatedAt: 1 }],
    itemsByList: { [listId]: [] }, stores: [], trash: [], categoryPreferences: {},
    activeListId: listId, onboardingSeen: false, hydrated: true,
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
});
