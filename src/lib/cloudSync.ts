import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useShopStore, type ShoppingItem, type ShoppingList, type Store } from '../store/store';
import { loadImageBlob, saveImageBlob } from './media';

export type SyncState = 'guest' | 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
type Listener = (state: SyncState, message?: string) => void;
const listeners = new Set<Listener>();
let currentState: SyncState = 'guest';
let currentMessage = '';
let householdId: string | null = null;
let channel: RealtimeChannel | null = null;
let syncing = false;
let activeSync: Promise<void> | null = null;

const emit = (state: SyncState, message = '') => {
  currentState = state; currentMessage = message; listeners.forEach((listener) => listener(state, message));
};
export const watchSync = (listener: Listener) => { listeners.add(listener); listener(currentState, currentMessage); return () => listeners.delete(listener); };

const iso = (time: number) => new Date(time).toISOString();
const millis = (time: string) => new Date(time).getTime();

async function performSync(): Promise<void> {
  if (!supabase || syncing || !navigator.onLine) { if (!navigator.onLine) emit('offline', 'Changes stay on this device until you reconnect.'); return; }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { emit('guest'); return; }
  syncing = true; emit('syncing');
  try {
    const { data: home, error: homeError } = await supabase.rpc('bootstrap_household', { household_name: 'My household' });
    if (homeError) throw homeError; householdId = home;
    const local = useShopStore.getState();

    // Pull clocks before writing so a stale device never overwrites a newer collaborator edit.
    const [initialLists, initialItems, memberships] = await Promise.all([
      supabase.from('shopping_lists').select('*'),
      supabase.from('shopping_items').select('*'),
      supabase.from('list_collaborators').select('*'),
    ]);
    if (initialLists.error) throw initialLists.error; if (initialItems.error) throw initialItems.error; if (memberships.error) throw memberships.error;
    const remoteListById = new Map(initialLists.data.map((row) => [row.id, row]));
    const remoteItemById = new Map(initialItems.data.map((row) => [row.id, row]));

    const ownedStores = local.stores.filter((store) => !store.remoteHouseholdId || store.remoteHouseholdId === home);
    if (ownedStores.length) {
      const { error } = await supabase.from('stores').upsert(ownedStores.map((store) => ({ id: store.id, household_id: store.remoteHouseholdId ?? home, name: store.name, address: store.address ?? null, updated_at: new Date().toISOString(), deleted_at: null })));
      if (error) throw error;
    }
    const changedLists = local.lists.filter((list) => { const remote = remoteListById.get(list.id); return !remote || (!remote.deleted_at && list.updatedAt > millis(remote.updated_at)); });
    if (changedLists.length) {
      const { error } = await supabase.from('shopping_lists').upsert(changedLists.map((list) => ({ id: list.id, household_id: remoteListById.get(list.id)?.household_id ?? list.remoteHouseholdId ?? home, name: list.name, budget: list.budget ?? null, currency: list.currency, store_id: list.storeId ?? null, created_at: iso(list.createdAt), updated_at: iso(list.updatedAt), deleted_at: null })));
      if (error) throw error;
    }
    const changedLocalItems = Object.entries(local.itemsByList).flatMap(([listId, items]) => items.filter((item) => { const remote = remoteItemById.get(item.id); return !remote || (!remote.deleted_at && item.updatedAt > millis(remote.updated_at)); }).map((item) => ({ listId, item })));
    const localItems = [];
    for (const { listId, item } of changedLocalItems) {
      let photoPath: string | null = null;
      const listHousehold = remoteListById.get(listId)?.household_id ?? local.lists.find((list) => list.id === listId)?.remoteHouseholdId ?? home;
      if (item.photoRef) {
        const blob = await loadImageBlob(item.photoRef);
        if (blob) { photoPath = `${listHousehold}/${listId}/${item.id}`; const { error } = await supabase.storage.from('item-photos').upload(photoPath, blob, { contentType: blob.type, upsert: true }); if (error) throw error; }
      }
      localItems.push({ id: item.id, household_id: remoteItemById.get(item.id)?.household_id ?? listHousehold, list_id: listId, name: item.name, catalog_id: item.catalogId ?? null, category: item.category, price: item.price ?? null, quantity: item.quantity, is_purchased: item.isPurchased, photo_path: photoPath, created_at: iso(item.createdAt), updated_at: iso(item.updatedAt), deleted_at: null });
    }
    if (localItems.length) { const { error } = await supabase.from('shopping_items').upsert(localItems); if (error) throw error; }
    for (const entry of local.trash) {
      const itemIds = entry.items.filter((item) => { const remote = remoteItemById.get(item.id); return remote && entry.deletedAt >= millis(remote.updated_at); }).map((item) => item.id);
      if (itemIds.length) { const deleted = iso(entry.deletedAt); const { error } = await supabase.from('shopping_items').update({ deleted_at: deleted, updated_at: deleted }).in('id', itemIds); if (error) throw error; }
      if (entry.kind === 'list' && remoteListById.has(entry.listId)) { const deleted = iso(entry.deletedAt); const { error } = await supabase.from('shopping_lists').update({ deleted_at: deleted, updated_at: deleted }).eq('id', entry.listId); if (error) throw error; }
    }

    const [remoteStores, remoteLists, remoteItems] = await Promise.all([
      supabase.from('stores').select('*').is('deleted_at', null),
      supabase.from('shopping_lists').select('*').is('deleted_at', null),
      supabase.from('shopping_items').select('*').is('deleted_at', null),
    ]);
    if (remoteStores.error) throw remoteStores.error; if (remoteLists.error) throw remoteLists.error; if (remoteItems.error) throw remoteItems.error;
    const stores: Store[] = remoteStores.data.map((row) => ({ id: row.id, name: row.name, address: row.address ?? undefined, remoteHouseholdId: row.household_id }));
    const collaboratorRole = new Map(memberships.data.map((membership) => [membership.list_id, membership.role]));
    const lists: ShoppingList[] = remoteLists.data.map((row) => ({ id: row.id, name: row.name, budget: row.budget ?? undefined, currency: row.currency, storeId: row.store_id ?? undefined, createdAt: millis(row.created_at), updatedAt: millis(row.updated_at), remoteHouseholdId: row.household_id, accessRole: row.household_id === home ? 'owner' : collaboratorRole.get(row.id) ?? 'viewer' }));
    const itemsByList: Record<string, ShoppingItem[]> = Object.fromEntries(lists.map((list) => [list.id, []]));
    for (const row of remoteItems.data) {
      if (row.photo_path && !(await loadImageBlob(row.photo_path))) { const { data } = await supabase.storage.from('item-photos').download(row.photo_path); if (data) await saveImageBlob(row.photo_path, data); }
      (itemsByList[row.list_id] ??= []).push({ id: row.id, name: row.name, catalogId: row.catalog_id ?? undefined, category: row.category, price: row.price ?? undefined, quantity: row.quantity, isPurchased: row.is_purchased, photoRef: row.photo_path ?? undefined, createdAt: millis(row.created_at), updatedAt: millis(row.updated_at) });
    }
    const localSignature = JSON.stringify({ lists: local.lists.map((list) => [list.id, list.updatedAt, list.accessRole, list.remoteHouseholdId]).sort(), items: Object.values(local.itemsByList).flat().map((item) => [item.id, item.updatedAt]).sort() });
    const remoteSignature = JSON.stringify({ lists: lists.map((list) => [list.id, list.updatedAt, list.accessRole, list.remoteHouseholdId]).sort(), items: Object.values(itemsByList).flat().map((item) => [item.id, item.updatedAt]).sort() });
    if (lists.length && localSignature !== remoteSignature) useShopStore.getState().replaceFromCloud({ stores, lists, itemsByList });
    emit('synced', `Backed up ${lists.length} list${lists.length === 1 ? '' : 's'}.`);
  } catch (error) { emit('error', error instanceof Error ? error.message : 'Sync failed. Your local data is safe.'); }
  finally { syncing = false; }
}

/** Coalesce concurrent callers so invite creation waits for the list's first upload. */
export function syncNow(): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = performSync().finally(() => { activeSync = null; });
  return activeSync;
}

export async function startCloudSync(session: Session | null): Promise<void> {
  if (!supabase) return;
  if (channel) { await supabase.removeChannel(channel); channel = null; }
  if (!session) { householdId = null; emit('guest'); return; }
  await syncNow();
  if (!householdId) return;
  channel = supabase.channel(`household:${householdId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, () => void syncNow())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => void syncNow())
    .subscribe();
}
