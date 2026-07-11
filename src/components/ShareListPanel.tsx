import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { Check, Copy, MessageCircle, MessageSquare, Send, Share2, Smartphone, X } from 'lucide-react';
import type { ShoppingList } from '../store/store';
import { cloudConfigured, supabase } from '../lib/supabase';
import { createListInvite, inviteMessage, type CreatedListInvite, type ListAccessRole } from '../lib/sharing';
import { AuthForm } from './AuthForm';
import './ShareListPanel.css';

export function ShareListPanel({ list, onClose }: { list: ShoppingList; onClose: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<ListAccessRole>('editor');
  const [invite, setInvite] = useState<CreatedListInvite | null>(null);
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const canShareList = list.accessRole !== 'viewer';
  const supportsNativeShare = typeof navigator.share === 'function';

  useEffect(() => {
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', keydown);
    if (!supabase) return () => window.removeEventListener('keydown', keydown);
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { data.subscription.unsubscribe(); window.removeEventListener('keydown', keydown); };
  }, [onClose]);

  const generate = async () => {
    setBusy(true); setNotice('');
    try { setInvite(await createListInvite(list.id, role)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not create the invitation.'); }
    finally { setBusy(false); }
  };
  const shareText = invite ? inviteMessage(invite) : '';
  const copy = async () => {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite.url); setNotice('Invitation link copied.'); }
    catch { setNotice('Copy failed. Select and copy the link below.'); }
  };
  const nativeShare = async () => {
    if (!invite || !navigator.share) return;
    try { await navigator.share({ title: `Join “${invite.listName}” in CoShop`, text: `Join as ${invite.role === 'editor' ? 'an editor' : 'a viewer'}.`, url: invite.url }); }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; setNotice('Your share menu could not be opened. The link is still available below.'); }
  };
  const sendSms = () => {
    if (!invite) return;
    const recipient = phone.replace(/[^+\d]/g, '');
    const separator = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${recipient}${separator}body=${encodeURIComponent(shareText)}`;
  };
  const sendTelegram = () => {
    if (!invite) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(invite.url)}&text=${encodeURIComponent(`Join my “${invite.listName}” shopping list in CoShop as ${invite.role === 'editor' ? 'an editor' : 'a viewer'}.`)}`, '_blank', 'noopener,noreferrer');
  };
  const sendWhatsApp = () => {
    if (!invite) return;
    const recipient = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  return createPortal(<div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal glass-strong share-panel" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div className="modal__head"><h3 id="share-title"><Share2 size={19} /> Share “{list.name}”</h3><button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <p className="share-panel__intro">Invite someone to this list only. CoShop will not request your contacts or see who you message.</p>
      {!cloudConfigured ? <p className="account-panel__feedback">Cloud sharing is not configured for this deployment.</p>
      : !session ? <><p className="share-panel__intro">Sign in to create a revocable invitation. Your existing list will be preserved.</p><AuthForm redirectTo={window.location.href} onNotice={setNotice} /></>
      : !canShareList ? <p className="account-panel__feedback">You have view-only access. Ask a list editor to create an invitation.</p>
      : <>
        <fieldset className="share-panel__roles"><legend>Access level</legend><label className={role === 'editor' ? 'share-panel__role--active' : ''}><input type="radio" name="invite-role" value="editor" checked={role === 'editor'} onChange={() => { setRole('editor'); setInvite(null); }} /><span><strong>Can edit</strong><small>Add, change, and check off items</small></span></label><label className={role === 'viewer' ? 'share-panel__role--active' : ''}><input type="radio" name="invite-role" value="viewer" checked={role === 'viewer'} onChange={() => { setRole('viewer'); setInvite(null); }} /><span><strong>View only</strong><small>See the list without changing it</small></span></label></fieldset>
        {!invite ? <button className="btn-primary" disabled={busy} onClick={() => void generate()}><Share2 size={17} /> {busy ? 'Creating secure link…' : 'Create invitation link'}</button> : <>
          <div className="share-panel__ready"><Check size={17} /><div><strong>Invitation ready</strong><span>Single use · expires {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(invite.expiresAt))}</span></div></div>
          {supportsNativeShare && <button className="btn-primary" onClick={() => void nativeShare()}><Smartphone size={17} /> Messages, WhatsApp & more</button>}
          <div className="share-panel__channels"><button className="btn-ghost" onClick={() => void copy()}><Copy size={16} /> Copy link</button><button className="btn-ghost" onClick={sendWhatsApp}><MessageCircle size={16} /> WhatsApp</button><button className="btn-ghost" onClick={sendTelegram}><Send size={16} /> Telegram</button></div>
          <div className="share-panel__sms"><label htmlFor="invite-phone">Phone number for SMS <span>(optional)</span></label><div className="account-panel__row"><input id="invite-phone" className="field" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+33 6 12 34 56 78" /><button className="btn-ghost" onClick={sendSms}><MessageSquare size={16} /> Open SMS</button></div><small>The number stays in this form and is not uploaded.</small></div>
          <input className="field share-panel__link" value={invite.url} readOnly aria-label="Invitation link" onFocus={(event) => event.currentTarget.select()} />
        </>}
      </>}
      {notice && <p className="account-panel__feedback" role="status">{notice}</p>}
    </section>
  </div>, document.body);
}
