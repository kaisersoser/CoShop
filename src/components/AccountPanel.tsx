import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { Check, Cloud, CloudOff, Copy, Download, LogOut, Mail, RefreshCw, Share2, X } from 'lucide-react';
import { acceptInvite, createInvite, startCloudSync, syncNow, watchSync, type SyncState } from '../lib/cloudSync';
import { cloudConfigured, supabase } from '../lib/supabase';
import { useShopStore } from '../store/store';
import './AccountPanel.css';

interface Props { onClose: () => void; }

export function AccountPanel({ onClose }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState('');
  const [createdInvite, setCreatedInvite] = useState('');
  const [status, setStatus] = useState<SyncState>('guest');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const stopWatch = watchSync((next, detail) => { setStatus(next); setMessage(detail ?? ''); });
    if (!supabase) return () => { stopWatch(); window.removeEventListener('keydown', onKey); };
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); void startCloudSync(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); void startCloudSync(next); });
    return () => { data.subscription.unsubscribe(); stopWatch(); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const sendMagicLink = async () => {
    if (!supabase || !email.trim()) return;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setNotice(error ? error.message : 'Check your email for a secure sign-in link. Your lists will remain here.');
  };

  const exportData = () => {
    const state = useShopStore.getState();
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, lists: state.lists, itemsByList: state.itemsByList, stores: state.stores }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `coshop-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal glass-strong account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div className="modal__head"><h3 id="account-title"><Cloud size={19} /> Backup & share</h3><button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <p className="account-panel__intro">CoShop works on this device without an account. Sign in only when you want backup, another device, or household sharing.</p>
        {!cloudConfigured ? (
          <div className="account-panel__notice"><CloudOff size={18} /><div><strong>Local mode</strong><span>Cloud backup has not been configured for this deployment. Your lists still work offline.</span></div></div>
        ) : !session ? (
          <div className="account-panel__section"><label className="composer__label" htmlFor="account-email">Email for a secure sign-in link</label><div className="account-panel__row"><input id="account-email" className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><button className="btn-primary" disabled={!email.trim()} onClick={sendMagicLink}><Mail size={16} /> Send link</button></div></div>
        ) : (
          <><div className="account-panel__identity"><Check size={16} /><div><strong>Signed in</strong><span>{session.user.email}</span></div><button className="btn-ghost" onClick={() => supabase?.auth.signOut()}><LogOut size={14} /> Sign out</button></div><div className="account-panel__status" role="status"><span className={`sync-dot sync-dot--${status}`} /><span>{status === 'syncing' ? 'Syncing…' : status === 'synced' ? message || 'Backed up' : message || 'Ready to sync'}</span><button className="icon-btn" onClick={() => void syncNow()} aria-label="Sync now"><RefreshCw size={15} /></button></div><div className="account-panel__section"><h4><Share2 size={16} /> Household sharing</h4><p>Create a one-time invite code, or enter one from another household owner.</p><div className="account-panel__row"><button className="btn-ghost" onClick={async () => { try { setCreatedInvite(await createInvite()); } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not create invite.'); } }}><Copy size={15} /> Create invite</button>{createdInvite && <code className="invite-code">{createdInvite}</code>}</div><div className="account-panel__row"><input className="field" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Paste invite code" aria-label="Household invite code" /><button className="btn-ghost" disabled={!invite.trim()} onClick={async () => { try { await acceptInvite(invite); setNotice('Household joined and lists synced.'); } catch (e) { setNotice(e instanceof Error ? e.message : 'Invite could not be accepted.'); } }}>Join</button></div></div></>
        )}
        {notice && <p className="account-panel__feedback" role="status">{notice}</p>}
        <div className="account-panel__export"><div><strong>Own your data</strong><span>Download lists and item details as JSON at any time. <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy notice</a></span></div><button className="btn-ghost" onClick={exportData}><Download size={15} /> Export</button></div>
      </section>
    </div>, document.body,
  );
}
