import { createStore, del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const appStore = createStore('coshop', 'state');

/** Async Zustand storage backed by IndexedDB. localStorage is read only by migrations. */
export const indexedDbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name, appStore)) ?? null,
  setItem: async (name, value) => set(name, value, appStore),
  removeItem: async (name) => del(name, appStore),
};

export const legacyLocalState = (): string | null => {
  try {
    return localStorage.getItem('coshop-store-v1');
  } catch {
    return null;
  }
};

export const clearLegacyLocalState = (): void => {
  try {
    localStorage.removeItem('coshop-store-v1');
  } catch {
    // Storage may be unavailable in privacy modes; IndexedDB remains authoritative.
  }
};
