import { supabase } from './supabase';
import { syncNow } from './cloudSync';

export type ListAccessRole = 'viewer' | 'editor';
export interface ListInvitePreview { listName: string; role: ListAccessRole; expiresAt: string; valid: boolean; }
export interface CreatedListInvite extends ListInvitePreview { token: string; url: string; }

export async function createListInvite(listId: string, role: ListAccessRole): Promise<CreatedListInvite> {
  if (!supabase) throw new Error('Cloud sharing is not configured.');
  await syncNow();
  const { data, error } = await supabase.rpc('create_list_invite', { target_list: listId, access_role: role });
  if (error) throw error;
  const invite = data[0];
  if (!invite) throw new Error('The invitation could not be created.');
  return { token: invite.token, url: `${window.location.origin}/join/${encodeURIComponent(invite.token)}`, listName: invite.list_name, role: invite.role, expiresAt: invite.expires_at, valid: true };
}

export async function previewListInvite(token: string): Promise<ListInvitePreview | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('preview_list_invite', { invite_token: token });
  if (error) throw error;
  const preview = data[0];
  return preview ? { listName: preview.list_name, role: preview.role, expiresAt: preview.expires_at, valid: preview.valid } : null;
}

export async function acceptListInvite(token: string): Promise<string> {
  if (!supabase) throw new Error('Cloud sharing is not configured.');
  const { data, error } = await supabase.rpc('accept_list_invite', { invite_token: token });
  if (error) throw error;
  await syncNow();
  return data;
}

export const inviteMessage = (invite: Pick<CreatedListInvite, 'listName' | 'role' | 'url'>) =>
  `Join my “${invite.listName}” shopping list in CoShop as ${invite.role === 'editor' ? 'an editor' : 'a viewer'}: ${invite.url}`;
