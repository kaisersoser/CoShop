import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { resolveItem, categoryForCatalogId } from '../lib/categorize';
import { OTHER_CATEGORY_ID } from '../data/categories';

/* ============================================================================
   CoShop — Zustand Global Store
   ----------------------------------------------------------------------------
   Multi-list, catalog-driven shopping state. Persisted to localStorage so the
   app works fully offline and rehydrates on next launch.

   Model (Phase 1):
     - Multiple named, reusable lists.
     - Items are grouped by product `category` (derived from the catalog).
     - Optional store/location, tagged at the LIST level (item-level storeIds
       are modeled for the future two-level view but have no UI yet).
     - `price` is optional.
   ========================================================================== */

/** A single line item on a shopping list. */
export interface ShoppingItem {
  id: string;
  name: string;
  /** Catalog product id when the item matched a known product. */
  catalogId?: string;
  /** Category id (see data/categories.ts); `other` when unmatched. */
  category: string;
  /** Optional unit price in the user's currency. */
  price?: number;
  quantity: number;
  isPurchased: boolean;
  /** Modeled for the two-level (store→category) north star; no UI in P1. */
  storeIds?: string[];
  /** Optional base64-encoded photo for brand/reference. */
  photoBase64?: string;
  createdAt: number;
}

/** A named, reusable shopping list. */
export interface ShoppingList {
  id: string;
  name: string;
  /** Optional budget used by the cost calculator. */
  budget?: number;
  /** Optional list-level store/location tag. */
  storeId?: string;
  createdAt: number;
  updatedAt: number;
}

/** An optional shopping location a list (and later items) can be tagged with. */
export interface Store {
  id: string;
  name: string;
  address?: string;
}

/** Structured input accepted by addItem. Category/ catalogId are resolved from
 *  `name` when omitted, so callers can pass either raw text or a known match. */
export interface AddItemInput {
  name: string;
  catalogId?: string;
  category?: string;
  price?: number;
  quantity?: number;
  photoBase64?: string;
  storeIds?: string[];
}

/** Shape of the persisted store. */
interface ShopState {
  lists: ShoppingList[];
  itemsByList: Record<string, ShoppingItem[]>;
  stores: Store[];
  activeListId: string;
  onboardingSeen: boolean;

  // ---- List actions ----
  createList: (name?: string) => string;
  renameList: (id: string, name: string) => void;
  duplicateList: (id: string) => string;
  deleteList: (id: string) => void;
  setActiveList: (id: string) => void;
  setListBudget: (id: string, budget: number | undefined) => void;
  /** Tag a list with an existing store, a new store (by name), or clear it. */
  setListStore: (id: string, store: { name: string; address?: string } | null) => void;

  // ---- Item actions (operate on the active list) ----
  addItem: (input: AddItemInput) => void;
  toggleItemStatus: (id: string) => void;
  updateItem: (id: string, patch: Partial<Omit<ShoppingItem, 'id' | 'createdAt'>>) => void;
  deleteItem: (id: string) => void;
  setItemCategory: (id: string, category: string) => void;
  clearPurchased: () => void;

  // ---- Misc ----
  dismissOnboarding: () => void;
}

/** Small helper to mint collision-resistant ids without external deps. */
const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/** A friendly default list label, e.g. "Week of Jun 22". */
const defaultListName = (): string => {
  const d = new Date();
  return `Week of ${d.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`;
};

/** Build a fully-formed item from structured input, resolving the catalog. */
const buildItem = (input: AddItemInput): ShoppingItem => {
  let { name, catalogId, category } = input;
  if (!category) {
    if (catalogId) {
      category = categoryForCatalogId(catalogId);
    } else {
      const resolved = resolveItem(name);
      name = resolved.name;
      catalogId = resolved.catalogId;
      category = resolved.category;
    }
  }
  return {
    id: uid(),
    name: name.trim(),
    catalogId,
    category: category ?? OTHER_CATEGORY_ID,
    price: input.price,
    quantity: Math.max(1, input.quantity ?? 1),
    isPurchased: false,
    storeIds: input.storeIds,
    photoBase64: input.photoBase64,
    createdAt: Date.now(),
  };
};

/** Initial seed items so the prototype looks alive on first launch. */
const seedItems = (): ShoppingItem[] => {
  const now = Date.now();
  const seeds: AddItemInput[] = [
    { name: 'Oat Milk', price: 4.99, quantity: 2 },
    { name: 'Sourdough Loaf', price: 6.5, quantity: 1 },
    { name: 'Organic Avocados', price: 0.99, quantity: 4 },
    { name: 'Cold Brew Concentrate', price: 11.99, quantity: 1 },
    { name: 'Bananas', price: 0.59, quantity: 6 },
  ];
  return seeds.map((s, i) => ({ ...buildItem(s), createdAt: now + i }));
};

/** Fresh initial state for a first-ever launch. */
const initialState = () => {
  const listId = uid();
  const now = Date.now();
  const list: ShoppingList = {
    id: listId,
    name: defaultListName(),
    budget: 120,
    createdAt: now,
    updatedAt: now,
  };
  return {
    lists: [list],
    itemsByList: { [listId]: seedItems() },
    stores: [] as Store[],
    activeListId: listId,
    onboardingSeen: false,
  };
};

/** Touch a list's updatedAt timestamp. */
const touch = (lists: ShoppingList[], id: string): ShoppingList[] =>
  lists.map((l) => (l.id === id ? { ...l, updatedAt: Date.now() } : l));

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      // ---- List actions ----
      createList: (name) => {
        const id = uid();
        const now = Date.now();
        set((state) => ({
          lists: [
            ...state.lists,
            { id, name: name?.trim() || defaultListName(), createdAt: now, updatedAt: now },
          ],
          itemsByList: { ...state.itemsByList, [id]: [] },
          activeListId: id,
        }));
        return id;
      },

      renameList: (id, name) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() } : l,
          ),
        })),

      duplicateList: (id) => {
        const state = get();
        const src = state.lists.find((l) => l.id === id);
        if (!src) return id;
        const newId = uid();
        const now = Date.now();
        const copyItems = (state.itemsByList[id] ?? []).map((it) => ({
          ...it,
          id: uid(),
          isPurchased: false,
          createdAt: Date.now(),
        }));
        set({
          lists: [
            ...state.lists,
            { ...src, id: newId, name: `${src.name} (copy)`, createdAt: now, updatedAt: now },
          ],
          itemsByList: { ...state.itemsByList, [newId]: copyItems },
          activeListId: newId,
        });
        return newId;
      },

      deleteList: (id) =>
        set((state) => {
          if (state.lists.length <= 1) return state; // never delete the last list
          const lists = state.lists.filter((l) => l.id !== id);
          const itemsByList = { ...state.itemsByList };
          delete itemsByList[id];
          const activeListId =
            state.activeListId === id ? lists[0].id : state.activeListId;
          return { lists, itemsByList, activeListId };
        }),

      setActiveList: (id) =>
        set((state) =>
          state.lists.some((l) => l.id === id) ? { activeListId: id } : state,
        ),

      setListBudget: (id, budget) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === id ? { ...l, budget, updatedAt: Date.now() } : l,
          ),
        })),

      setListStore: (id, store) =>
        set((state) => {
          if (store === null) {
            return {
              lists: state.lists.map((l) =>
                l.id === id ? { ...l, storeId: undefined, updatedAt: Date.now() } : l,
              ),
            };
          }
          // Reuse an existing store with the same name, else create one.
          const existing = state.stores.find(
            (s) => s.name.toLowerCase() === store.name.trim().toLowerCase(),
          );
          const storeId = existing?.id ?? uid();
          const stores = existing
            ? state.stores
            : [...state.stores, { id: storeId, name: store.name.trim(), address: store.address }];
          return {
            stores,
            lists: state.lists.map((l) =>
              l.id === id ? { ...l, storeId, updatedAt: Date.now() } : l,
            ),
          };
        }),

      // ---- Item actions ----
      addItem: (input) =>
        set((state) => {
          const id = state.activeListId;
          const current = state.itemsByList[id] ?? [];
          return {
            itemsByList: { ...state.itemsByList, [id]: [buildItem(input), ...current] },
            lists: touch(state.lists, id),
          };
        }),

      toggleItemStatus: (itemId) =>
        set((state) => {
          const id = state.activeListId;
          const current = state.itemsByList[id] ?? [];
          return {
            itemsByList: {
              ...state.itemsByList,
              [id]: current.map((it) =>
                it.id === itemId ? { ...it, isPurchased: !it.isPurchased } : it,
              ),
            },
          };
        }),

      updateItem: (itemId, patch) =>
        set((state) => {
          const id = state.activeListId;
          const current = state.itemsByList[id] ?? [];
          return {
            itemsByList: {
              ...state.itemsByList,
              [id]: current.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
            },
            lists: touch(state.lists, id),
          };
        }),

      deleteItem: (itemId) =>
        set((state) => {
          const id = state.activeListId;
          const current = state.itemsByList[id] ?? [];
          return {
            itemsByList: { ...state.itemsByList, [id]: current.filter((it) => it.id !== itemId) },
            lists: touch(state.lists, id),
          };
        }),

      setItemCategory: (itemId, category) =>
        set((state) => {
          const id = state.activeListId;
          const current = state.itemsByList[id] ?? [];
          return {
            itemsByList: {
              ...state.itemsByList,
              [id]: current.map((it) => (it.id === itemId ? { ...it, category } : it)),
            },
          };
        }),

      clearPurchased: () =>
        set((state) => {
          const id = state.activeListId;
          const current = state.itemsByList[id] ?? [];
          return {
            itemsByList: { ...state.itemsByList, [id]: current.filter((it) => !it.isPurchased) },
          };
        }),

      dismissOnboarding: () => set({ onboardingSeen: true }),
    }),
    {
      name: 'coshop-store-v1', // storage key kept stable so v1 data migrates in place
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lists: state.lists,
        itemsByList: state.itemsByList,
        stores: state.stores,
        activeListId: state.activeListId,
        onboardingSeen: state.onboardingSeen,
      }),
      migrate: (persisted, version) => migrateState(persisted, version),
    },
  ),
);

/* ----------------------------------------------------------------------------
   Migration — fold the old single-list v1 shape into the multi-list v2 shape.
   -------------------------------------------------------------------------- */

interface LegacyItem {
  id: string;
  name: string;
  store?: string;
  price?: number;
  quantity?: number;
  isPurchased?: boolean;
  photoBase64?: string;
  createdAt?: number;
}
interface LegacyState {
  list?: { id?: string; weekName?: string; budget?: number };
  items?: LegacyItem[];
}

function migrateState(persisted: unknown, version: number) {
  // Already current (or newer) — pass through.
  if (version >= 2 || !persisted || typeof persisted !== 'object') {
    return persisted as Partial<ShopState>;
  }

  const legacy = persisted as LegacyState;
  const listId = legacy.list?.id ?? uid();
  const now = Date.now();

  const items: ShoppingItem[] = (legacy.items ?? []).map((it, i) => {
    const resolved = resolveItem(it.name ?? '');
    return {
      id: it.id ?? uid(),
      name: it.name ?? resolved.name,
      catalogId: resolved.catalogId,
      category: resolved.category,
      price: typeof it.price === 'number' ? it.price : undefined,
      quantity: Math.max(1, it.quantity ?? 1),
      isPurchased: Boolean(it.isPurchased),
      photoBase64: it.photoBase64,
      createdAt: it.createdAt ?? now + i,
    };
  });

  // If every legacy item shared one store, lift it to a list-level store tag.
  const legacyStores = [...new Set((legacy.items ?? []).map((it) => it.store).filter(Boolean))];
  const stores: Store[] = [];
  let storeId: string | undefined;
  if (legacyStores.length === 1) {
    storeId = uid();
    stores.push({ id: storeId, name: legacyStores[0] as string });
  }

  const list: ShoppingList = {
    id: listId,
    name: legacy.list?.weekName ?? defaultListName(),
    budget: legacy.list?.budget ?? 120,
    storeId,
    createdAt: now,
    updatedAt: now,
  };

  return {
    lists: [list],
    itemsByList: { [listId]: items },
    stores,
    activeListId: listId,
    onboardingSeen: true, // returning users skip onboarding
  } as Partial<ShopState>;
}

/* ----------------------------------------------------------------------------
   Selectors — operate on the ACTIVE list. Missing price counts as 0.
   -------------------------------------------------------------------------- */

/** Items belonging to the currently active list. */
export const selectActiveItems = (s: ShopState): ShoppingItem[] =>
  s.itemsByList[s.activeListId] ?? [];

/** The currently active list object. */
export const selectActiveList = (s: ShopState): ShoppingList | undefined =>
  s.lists.find((l) => l.id === s.activeListId);

/** The store tagged on the active list, if any. */
export const selectActiveStore = (s: ShopState): Store | undefined => {
  const list = selectActiveList(s);
  return list?.storeId ? s.stores.find((st) => st.id === list.storeId) : undefined;
};

const lineCost = (it: ShoppingItem): number => (it.price ?? 0) * it.quantity;

/** Sum of (price * quantity) where isPurchased === true (active list). */
export const selectInCartTotal = (s: ShopState): number =>
  selectActiveItems(s).reduce((sum, it) => (it.isPurchased ? sum + lineCost(it) : sum), 0);

/** Sum of (price * quantity) across ALL items in the active list (the estimate). */
export const selectEstimatedTotal = (s: ShopState): number =>
  selectActiveItems(s).reduce((sum, it) => sum + lineCost(it), 0);
