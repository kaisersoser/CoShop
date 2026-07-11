import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { Check, Cloud, CloudOff, Download, LogOut, RefreshCw, X } from 'lucide-react';
import { startCloudSync, syncNow, watchSync, type SyncState } from '../lib/cloudSync';
import { cloudConfigured, supabase } from '../lib/supabase';
import { useShopStore } from '../store/store';
import { AuthForm } from './AuthForm';
import './AccountPanel.css';

interface Props { onClose: () => void; }

export function AccountPanel({ onClose }: Props) {
  const [session, setSession] = useState<Session | null>(null);
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
        <p className="account-panel__intro">CoShop works on this device without an account. Sign in only when you want backup, another device, or shared lists.</p>
        {!cloudConfigured ? (
          <div className="account-panel__notice"><CloudOff size={18} /><div><strong>Local mode</strong><span>Cloud backup has not been configured for this deployment. Your lists still work offline.</span></div></div>
        ) : !session ? (
          <AuthForm redirectTo={window.location.origin} onNotice={setNotice} />
        ) : (
          <><div className="account-panel__identity"><Check size={16} /><div><strong>Signed in</strong><span>{session.user.email ?? maskPhone(session.user.phone)}</span></div><button className="btn-ghost" onClick={() => supabase?.auth.signOut()}><LogOut size={14} /> Sign out</button></div><div className="account-panel__status" role="status"><span className={`sync-dot sync-dot--${status}`} /><span>{status === 'syncing' ? 'Syncing…' : status === 'synced' ? message || 'Backed up' : message || 'Ready to sync'}</span><button className="icon-btn" onClick={() => void syncNow()} aria-label="Sync now"><RefreshCw size={15} /></button></div><p className="account-panel__intro">Use the Share button on a list to invite someone by Messages, WhatsApp, Telegram, or another installed app.</p></>
        )}
        {notice && <p className="account-panel__feedback" role="status">{notice}</p>}
        <div className="account-panel__export"><div><strong>Own your data</strong><span>Download lists and item details as JSON at any time. <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy notice</a></span></div><button className="btn-ghost" onClick={exportData}><Download size={15} /> Export</button></div>
      </section>
    </div>, document.body,
  );
}

const maskPhone = (phone?: string) => phone ? `${phone.slice(0, 3)}••••${phone.slice(-3)}` : 'Verified account';
