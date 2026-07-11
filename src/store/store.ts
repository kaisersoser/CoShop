import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { categoryForCatalogId, resolveItem } from '../lib/categorize';
import { OTHER_CATEGORY_ID } from '../data/categories';
import { clearLegacyLocalState, indexedDbStorage, legacyLocalState } from '../lib/storage';
import { saveImage } from '../lib/media';
import { defaultListName, normalizeLanguage, REGION_DEFAULTS } from '../data/preferences';

export interface ShoppingItem {
  id: string;
  name: string;
  catalogId?: string;
  category: string;
  price?: number;
  quantity: number;
  isPurchased: boolean;
  storeIds?: string[];
  photoRef?: string;
  /** Read only during the v2 migration, then moved into the media store on edit. */
  photoBase64?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  budget?: number;
  currency: string;
  storeId?: string;
  createdAt: number;
  updatedAt: number;
  /** Remote authorization metadata; absent for guest-only lists. */
  remoteHouseholdId?: string;
  accessRole?: 'owner' | 'editor' | 'viewer';
}

export interface Store { id: string; name: string; address?: string; remoteHouseholdId?: string; }
export interface UserPreferences { region: string; language: string; defaultCurrency: string; }
export interface AddItemInput {
  name: string;
  catalogId?: string;
  category?: string;
  price?: number;
  quantity?: number;
  photoRef?: string;
  storeIds?: string[];
}

export interface TrashEntry {
  id: string;
  kind: 'item' | 'items' | 'list';
  label: string;
  list?: ShoppingList;
  listId: string;
  items: ShoppingItem[];
  deletedAt: number;
}

export interface ShopState {
  lists: ShoppingList[];
  itemsByList: Record<string, ShoppingItem[]>;
  stores: Store[];
  trash: TrashEntry[];
  categoryPreferences: Record<string, string>;
  activeListId: string;
  onboardingSeen: boolean;
  hydrated: boolean;
  preferences: UserPreferences;

  createList: (name?: string) => string;
  renameList: (id: string, name: string) => void;
  duplicateList: (id: string) => string;
  deleteList: (id: string) => void;
  setActiveList: (id: string) => void;
  setListBudget: (id: string, budget: number | undefined) => void;
  setListCurrency: (id: string, currency: string) => void;
  setListStore: (id: string, store: { name: string; address?: string } | null) => void;
  addItem: (input: AddItemInput) => void;
  toggleItemStatus: (id: string) => void;
  updateItem: (id: string, patch: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>) => void;
  deleteItem: (id: string) => void;
  setItemCategory: (id: string, category: string) => void;
  clearPurchased: () => void;
  restoreTrash: (id?: string) => void;
  dismissTrash: (id: string) => void;
  dismissOnboarding: () => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  replaceFromCloud: (data: Pick<ShopState, 'lists' | 'itemsByList' | 'stores'>) => void;
}

const uid = (): string => crypto.randomUUID();
const normalize = (value: string) => value.trim().toLocaleLowerCase();
const regionCurrency: Record<string, string> = { US: 'USD', GB: 'GBP', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', JP: 'JPY' };
const initialPreferences = (): UserPreferences => {
  let region = 'US';
  let language = 'en';
  try {
    const browserLocale = new Intl.Locale(navigator.language);
    region = browserLocale.region ?? region;
    language = normalizeLanguage(browserLocale.language);
  } catch { /* use safe default */ }
  const supportedRegion = REGION_DEFAULTS[region];
  return { region, language: supportedRegion?.language ?? language, defaultCurrency: regionCurrency[region] ?? 'USD' };
};

const initialState = () => {
  const id = uid();
  const now = Date.now();
  const preferences = initialPreferences();
  return {
    lists: [{ id, name: defaultListName(preferences.language, preferences.region), currency: preferences.defaultCurrency, createdAt: now, updatedAt: now }],
    itemsByList: { [id]: [] },
    stores: [] as Store[],
    trash: [] as TrashEntry[],
    categoryPreferences: {} as Record<string, string>,
    activeListId: id,
    onboardingSeen: false,
    hydrated: false,
    preferences,
  };
};

const buildItem = (input: AddItemInput, preferences: Record<string, string>): ShoppingItem => {
  let { name, catalogId, category } = input;
  if (!category) {
    category = preferences[normalize(name)];
    if (!category && catalogId) category = categoryForCatalogId(catalogId);
    if (!category) {
      const resolved = resolveItem(name);
      // Preserve exactly what the user typed; catalog matching only supplies metadata.
      catalogId = resolved.catalogId;
      category = resolved.category;
    }
  }
  const now = Date.now();
  return {
    id: uid(), name: name.trim(), catalogId, category: category ?? OTHER_CATEGORY_ID,
    price: input.price, quantity: Math.max(1, input.quantity ?? 1), isPurchased: false,
    storeIds: input.storeIds, photoRef: input.photoRef, createdAt: now, updatedAt: now,
  };
};
const touch = (lists: ShoppingList[], id: string) =>
  lists.map((list) => list.id === id ? { ...list, updatedAt: Date.now() } : list);

export const useShopStore = create<ShopState>()(persist((set, get) => ({
  ...initialState(),
  createList: (name) => {
    const id = uid(); const now = Date.now();
    set((s) => ({ lists: [...s.lists, { id, name: name?.trim() || defaultListName(s.preferences.language, s.preferences.region), currency: s.preferences.defaultCurrency, createdAt: now, updatedAt: now }], itemsByList: { ...s.itemsByList, [id]: [] }, activeListId: id }));
    return id;
  },
  renameList: (id, name) => set((s) => ({ lists: s.lists.map((l) => l.id === id && l.accessRole !== 'viewer' ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() } : l) })),
  duplicateList: (id) => {
    const s = get(); const source = s.lists.find((l) => l.id === id); if (!source) return id;
    const newId = uid(); const now = Date.now();
    const items = (s.itemsByList[id] ?? []).map((item) => ({ ...item, id: uid(), isPurchased: false, createdAt: now, updatedAt: now }));
    const { remoteHouseholdId: _remoteHouseholdId, accessRole: _accessRole, ...localSource } = source;
    set({ lists: [...s.lists, { ...localSource, id: newId, name: `${source.name} (copy)`, createdAt: now, updatedAt: now }], itemsByList: { ...s.itemsByList, [newId]: items }, activeListId: newId });
    return newId;
  },
  deleteList: (id) => set((s) => {
    if (s.lists.length <= 1) return s;
    const list = s.lists.find((l) => l.id === id); if (!list) return s;
    if (list.remoteHouseholdId && list.accessRole !== 'owner') return s;
    const entry: TrashEntry = { id: uid(), kind: 'list', label: list.name, list, listId: id, items: s.itemsByList[id] ?? [], deletedAt: Date.now() };
    const lists = s.lists.filter((l) => l.id !== id); const itemsByList = { ...s.itemsByList }; delete itemsByList[id];
    return { lists, itemsByList, trash: [entry, ...s.trash].slice(0, 25), activeListId: s.activeListId === id ? lists[0].id : s.activeListId };
  }),
  setActiveList: (id) => set((s) => s.lists.some((l) => l.id === id) ? { activeListId: id } : s),
  setListBudget: (id, budget) => set((s) => ({ lists: s.lists.map((l) => l.id === id && l.accessRole !== 'viewer' ? { ...l, budget, updatedAt: Date.now() } : l) })),
  setListCurrency: (id, currency) => set((s) => ({ lists: s.lists.map((l) => l.id === id && l.accessRole !== 'viewer' ? { ...l, currency, updatedAt: Date.now() } : l) })),
  setListStore: (id, input) => set((s) => {
    const target = s.lists.find((list) => list.id === id);
    if (target?.remoteHouseholdId && target.accessRole !== 'owner') return s;
    if (!input) return { lists: s.lists.map((l) => l.id === id ? { ...l, storeId: undefined, updatedAt: Date.now() } : l) };
    const existing = s.stores.find((store) => normalize(store.name) === normalize(input.name)); const storeId = existing?.id ?? uid();
    return { stores: existing ? s.stores : [...s.stores, { id: storeId, name: input.name.trim(), address: input.address }], lists: s.lists.map((l) => l.id === id ? { ...l, storeId, updatedAt: Date.now() } : l) };
  }),
  addItem: (input) => set((s) => { const id = s.activeListId; if (s.lists.find((list) => list.id === id)?.accessRole === 'viewer') return s; return { itemsByList: { ...s.itemsByList, [id]: [buildItem(input, s.categoryPreferences), ...(s.itemsByList[id] ?? [])] }, lists: touch(s.lists, id), onboardingSeen: true }; }),
  toggleItemStatus: (itemId) => set((s) => { const id = s.activeListId; if (s.lists.find((list) => list.id === id)?.accessRole === 'viewer') return s; return { itemsByList: { ...s.itemsByList, [id]: (s.itemsByList[id] ?? []).map((it) => it.id === itemId ? { ...it, isPurchased: !it.isPurchased, updatedAt: Date.now() } : it) }, lists: touch(s.lists, id) }; }),
  updateItem: (itemId, patch) => set((s) => { const id = s.activeListId; if (s.lists.find((list) => list.id === id)?.accessRole === 'viewer') return s; return { itemsByList: { ...s.itemsByList, [id]: (s.itemsByList[id] ?? []).map((it) => it.id === itemId ? { ...it, ...patch, updatedAt: Date.now() } : it) }, lists: touch(s.lists, id) }; }),
  deleteItem: (itemId) => set((s) => {
    const id = s.activeListId; const item = (s.itemsByList[id] ?? []).find((it) => it.id === itemId); if (!item) return s;
    if (s.lists.find((list) => list.id === id)?.accessRole === 'viewer') return s;
    const entry: TrashEntry = { id: uid(), kind: 'item', label: item.name, listId: id, items: [item], deletedAt: Date.now() };
    return { itemsByList: { ...s.itemsByList, [id]: (s.itemsByList[id] ?? []).filter((it) => it.id !== itemId) }, lists: touch(s.lists, id), trash: [entry, ...s.trash].slice(0, 25) };
  }),
  setItemCategory: (itemId, category) => set((s) => { const id = s.activeListId; if (s.lists.find((list) => list.id === id)?.accessRole === 'viewer') return s; const item = (s.itemsByList[id] ?? []).find((it) => it.id === itemId); return { itemsByList: { ...s.itemsByList, [id]: (s.itemsByList[id] ?? []).map((it) => it.id === itemId ? { ...it, category, updatedAt: Date.now() } : it) }, categoryPreferences: item ? { ...s.categoryPreferences, [normalize(item.name)]: category } : s.categoryPreferences }; }),
  clearPurchased: () => set((s) => {
    const id = s.activeListId; const removed = (s.itemsByList[id] ?? []).filter((it) => it.isPurchased); if (!removed.length) return s;
    if (s.lists.find((list) => list.id === id)?.accessRole === 'viewer') return s;
    const entry: TrashEntry = { id: uid(), kind: 'items', label: `${removed.length} purchased item${removed.length === 1 ? '' : 's'}`, listId: id, items: removed, deletedAt: Date.now() };
    return { itemsByList: { ...s.itemsByList, [id]: (s.itemsByList[id] ?? []).filter((it) => !it.isPurchased) }, lists: touch(s.lists, id), trash: [entry, ...s.trash].slice(0, 25) };
  }),
  restoreTrash: (trashId) => set((s) => {
    const entry = trashId ? s.trash.find((t) => t.id === trashId) : s.trash[0]; if (!entry) return s;
    if (entry.kind === 'list' && entry.list) return { lists: [...s.lists, entry.list], itemsByList: { ...s.itemsByList, [entry.listId]: entry.items }, trash: s.trash.filter((t) => t.id !== entry.id), activeListId: entry.listId };
    return { itemsByList: { ...s.itemsByList, [entry.listId]: [...entry.items, ...(s.itemsByList[entry.listId] ?? [])] }, trash: s.trash.filter((t) => t.id !== entry.id) };
  }),
  dismissTrash: (id) => set((s) => ({ trash: s.trash.filter((t) => t.id !== id) })),
  dismissOnboarding: () => set({ onboardingSeen: true }),
  updatePreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
  replaceFromCloud: (data) => set((s) => ({ ...data, activeListId: data.lists.some((l) => l.id === s.activeListId) ? s.activeListId : data.lists[0]?.id ?? s.activeListId })),
}), {
  name: 'coshop-store-v3', version: 3, storage: createJSONStorage(() => indexedDbStorage),
  partialize: (s) => ({ lists: s.lists, itemsByList: s.itemsByList, stores: s.stores, trash: s.trash, categoryPreferences: s.categoryPreferences, activeListId: s.activeListId, onboardingSeen: s.onboardingSeen, preferences: s.preferences }),
  onRehydrateStorage: () => () => { queueMicrotask(() => useShopStore.setState({ hydrated: true })); },
  migrate: (persisted) => ({ ...initialState(), ...(persisted as Partial<ShopState>), hydrated: true }),
}));

// One-time localStorage -> IndexedDB migration. Zustand v1/v2 payloads retain their IDs.
if (typeof window !== 'undefined' && legacyLocalState() && !localStorage.getItem('coshop-idb-migrated')) {
  try {
    const legacy = JSON.parse(legacyLocalState()!);
    const state = legacy.state as Partial<ShopState> | undefined;
    if (state?.lists?.length) {
      const itemsByList = { ...(state.itemsByList ?? {}) };
      void (async () => {
        for (const [listId, items] of Object.entries(itemsByList)) {
          itemsByList[listId] = await Promise.all(items.map(async (item) => {
            const photoRef = item.photoBase64 ? await saveImage(item.photoBase64) : item.photoRef;
            const { photoBase64: _legacyPhoto, ...clean } = item;
            return { ...clean, photoRef, updatedAt: item.updatedAt ?? item.createdAt ?? Date.now() };
          }));
        }
        const upgraded = { ...initialState(), ...state, itemsByList, lists: state.lists!.map((l) => ({ ...l, currency: l.currency ?? 'USD', updatedAt: l.updatedAt ?? l.createdAt ?? Date.now() })), hydrated: true };
        await Promise.resolve(indexedDbStorage.setItem('coshop-store-v3', JSON.stringify({ state: upgraded, version: 3 })));
        localStorage.setItem('coshop-idb-migrated', '1'); clearLegacyLocalState(); window.location.reload();
      })();
    }
  } catch { /* Invalid legacy state is left untouched for manual recovery/export. */ }
}

export const selectActiveItems = (s: ShopState) => s.itemsByList[s.activeListId] ?? [];
export const selectActiveList = (s: ShopState) => s.lists.find((l) => l.id === s.activeListId);
export const selectActiveStore = (s: ShopState) => { const list = selectActiveList(s); return list?.storeId ? s.stores.find((store) => store.id === list.storeId) : undefined; };
export const selectCanEditActive = (s: ShopState) => selectActiveList(s)?.accessRole !== 'viewer';
const lineCost = (item: ShoppingItem) => typeof item.price === 'number' ? item.price * item.quantity : 0;
export const selectInCartTotal = (s: ShopState) => selectActiveItems(s).reduce((sum, item) => item.isPurchased ? sum + lineCost(item) : sum, 0);
export const selectEstimatedTotal = (s: ShopState) => selectActiveItems(s).reduce((sum, item) => sum + lineCost(item), 0);
export const selectPriceCoverage = (s: ShopState) => { const items = selectActiveItems(s); const priced = items.filter((item) => typeof item.price === 'number'); return { priced: priced.length, total: items.length, missing: items.length - priced.length }; };
