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

const emit = (state: SyncState, message = '') => {
  currentState = state; currentMessage = message; listeners.forEach((listener) => listener(state, message));
};
export const watchSync = (listener: Listener) => { listeners.add(listener); listener(currentState, currentMessage); return () => listeners.delete(listener); };

const iso = (time: number) => new Date(time).toISOString();
const millis = (time: string) => new Date(time).getTime();

export async function syncNow(): Promise<void> {
  if (!supabase || syncing || !navigator.onLine) { if (!navigator.onLine) emit('offline', 'Changes stay on this device until you reconnect.'); return; }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { emit('guest'); return; }
  syncing = true; emit('syncing');
  try {
    const { data: home, error: homeError } = await supabase.rpc('bootstrap_household', { household_name: 'My household' });
    if (homeError) throw homeError; householdId = home;
    const local = useShopStore.getState();

    // Pull clocks before writing so a stale device never overwrites a newer collaborator edit.
    const [initialLists, initialItems] = await Promise.all([
      supabase.from('shopping_lists').select('*').eq('household_id', home),
      supabase.from('shopping_items').select('*').eq('household_id', home),
    ]);
    if (initialLists.error) throw initialLists.error; if (initialItems.error) throw initialItems.error;
    const remoteListById = new Map(initialLists.data.map((row) => [row.id, row]));
    const remoteItemById = new Map(initialItems.data.map((row) => [row.id, row]));

    if (local.stores.length) {
      const { error } = await supabase.from('stores').upsert(local.stores.map((store) => ({ id: store.id, household_id: home, name: store.name, address: store.address ?? null, updated_at: new Date().toISOString(), deleted_at: null })));
      if (error) throw error;
    }
    const changedLists = local.lists.filter((list) => { const remote = remoteListById.get(list.id); return !remote || (!remote.deleted_at && list.updatedAt > millis(remote.updated_at)); });
    if (changedLists.length) {
      const { error } = await supabase.from('shopping_lists').upsert(changedLists.map((list) => ({ id: list.id, household_id: home, name: list.name, budget: list.budget ?? null, currency: list.currency, store_id: list.storeId ?? null, created_at: iso(list.createdAt), updated_at: iso(list.updatedAt), deleted_at: null })));
      if (error) throw error;
    }
    const changedLocalItems = Object.entries(local.itemsByList).flatMap(([listId, items]) => items.filter((item) => { const remote = remoteItemById.get(item.id); return !remote || (!remote.deleted_at && item.updatedAt > millis(remote.updated_at)); }).map((item) => ({ listId, item })));
    const localItems = [];
    for (const { listId, item } of changedLocalItems) {
      let photoPath: string | null = null;
      if (item.photoRef) {
        const blob = await loadImageBlob(item.photoRef);
        if (blob) { photoPath = `${home}/${item.id}`; const { error } = await supabase.storage.from('item-photos').upload(photoPath, blob, { contentType: blob.type, upsert: true }); if (error) throw error; }
      }
      localItems.push({ id: item.id, household_id: home, list_id: listId, name: item.name, catalog_id: item.catalogId ?? null, category: item.category, price: item.price ?? null, quantity: item.quantity, is_purchased: item.isPurchased, photo_path: photoPath, created_at: iso(item.createdAt), updated_at: iso(item.updatedAt), deleted_at: null });
    }
    if (localItems.length) { const { error } = await supabase.from('shopping_items').upsert(localItems); if (error) throw error; }
    for (const entry of local.trash) {
      const itemIds = entry.items.filter((item) => { const remote = remoteItemById.get(item.id); return remote && entry.deletedAt >= millis(remote.updated_at); }).map((item) => item.id);
      if (itemIds.length) { const deleted = iso(entry.deletedAt); const { error } = await supabase.from('shopping_items').update({ deleted_at: deleted, updated_at: deleted }).in('id', itemIds); if (error) throw error; }
      if (entry.kind === 'list' && remoteListById.has(entry.listId)) { const deleted = iso(entry.deletedAt); const { error } = await supabase.from('shopping_lists').update({ deleted_at: deleted, updated_at: deleted }).eq('id', entry.listId); if (error) throw error; }
    }

    const [remoteStores, remoteLists, remoteItems] = await Promise.all([
      supabase.from('stores').select('*').eq('household_id', home).is('deleted_at', null),
      supabase.from('shopping_lists').select('*').eq('household_id', home).is('deleted_at', null),
      supabase.from('shopping_items').select('*').eq('household_id', home).is('deleted_at', null),
    ]);
    if (remoteStores.error) throw remoteStores.error; if (remoteLists.error) throw remoteLists.error; if (remoteItems.error) throw remoteItems.error;
    const stores: Store[] = remoteStores.data.map((row) => ({ id: row.id, name: row.name, address: row.address ?? undefined }));
    const lists: ShoppingList[] = remoteLists.data.map((row) => ({ id: row.id, name: row.name, budget: row.budget ?? undefined, currency: row.currency, storeId: row.store_id ?? undefined, createdAt: millis(row.created_at), updatedAt: millis(row.updated_at) }));
    const itemsByList: Record<string, ShoppingItem[]> = Object.fromEntries(lists.map((list) => [list.id, []]));
    for (const row of remoteItems.data) {
      if (row.photo_path && !(await loadImageBlob(row.photo_path))) { const { data } = await supabase.storage.from('item-photos').download(row.photo_path); if (data) await saveImageBlob(row.photo_path, data); }
      (itemsByList[row.list_id] ??= []).push({ id: row.id, name: row.name, catalogId: row.catalog_id ?? undefined, category: row.category, price: row.price ?? undefined, quantity: row.quantity, isPurchased: row.is_purchased, photoRef: row.photo_path ?? undefined, createdAt: millis(row.created_at), updatedAt: millis(row.updated_at) });
    }
    const localSignature = JSON.stringify({ lists: local.lists.map((list) => [list.id, list.updatedAt]).sort(), items: Object.values(local.itemsByList).flat().map((item) => [item.id, item.updatedAt]).sort() });
    const remoteSignature = JSON.stringify({ lists: lists.map((list) => [list.id, list.updatedAt]).sort(), items: Object.values(itemsByList).flat().map((item) => [item.id, item.updatedAt]).sort() });
    if (lists.length && localSignature !== remoteSignature) useShopStore.getState().replaceFromCloud({ stores, lists, itemsByList });
    emit('synced', `Backed up ${lists.length} list${lists.length === 1 ? '' : 's'}.`);
  } catch (error) { emit('error', error instanceof Error ? error.message : 'Sync failed. Your local data is safe.'); }
  finally { syncing = false; }
}

export async function startCloudSync(session: Session | null): Promise<void> {
  if (!supabase) return;
  if (channel) { await supabase.removeChannel(channel); channel = null; }
  if (!session) { householdId = null; emit('guest'); return; }
  await syncNow();
  if (!householdId) return;
  channel = supabase.channel(`household:${householdId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `household_id=eq.${householdId}` }, () => void syncNow())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${householdId}` }, () => void syncNow())
    .subscribe();
}

export async function createInvite(): Promise<string> {
  if (!supabase || !householdId) throw new Error('Sync your account first.');
  const { data, error } = await supabase.rpc('create_household_invite', { target: householdId });
  if (error) throw error; return data[0].token;
}
export async function acceptInvite(token: string): Promise<void> {
  if (!supabase) throw new Error('Cloud backup is not configured.');
  const { error } = await supabase.rpc('accept_household_invite', { invite_token: token.trim() });
  if (error) throw error; await syncNow();
}
