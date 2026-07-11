import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Check, Eye, ListChecks, Pencil, ShieldCheck } from 'lucide-react';
import { cloudConfigured, supabase } from '../lib/supabase';
import { acceptListInvite, previewListInvite, type ListInvitePreview } from '../lib/sharing';
import { useShopStore } from '../store/store';
import { AuthForm } from './AuthForm';
import './JoinListPage.css';
import { preferenceLocale } from '../data/preferences';

export function JoinListPage({ token }: { token: string }) {
  const [preview, setPreview] = useState<ListInvitePreview | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState('');
  const [joining, setJoining] = useState(false);
  const preferences = useShopStore((state) => state.preferences);
  const locale = preferenceLocale(preferences.language, preferences.region);

  useEffect(() => {
    if (!supabase) { setPreview(null); return; }
    void previewListInvite(token).then(setPreview).catch((error) => { setPreview(null); setNotice(error instanceof Error ? error.message : 'Invitation could not be checked.'); });
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [token]);

  const accept = async () => {
    setJoining(true); setNotice('');
    try {
      const listId = await acceptListInvite(token);
      useShopStore.getState().setActiveList(listId);
      window.location.replace('/');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'The invitation could not be accepted.'); setJoining(false); }
  };

  if (preview === undefined) return <main className="join-page"><div className="join-card glass-strong" role="status">Checking invitation…</div></main>;
  if (!cloudConfigured || !preview || !preview.valid) return <main className="join-page"><section className="join-card glass-strong"><ListChecks size={30} /><h1>Invitation unavailable</h1><p>{notice || 'This link is invalid, expired, revoked, or has already been used.'}</p><a className="btn-ghost" href="/"><ArrowLeft size={16} /> Open CoShop</a></section></main>;

  return <main className="join-page"><section className="join-card glass-strong" aria-labelledby="join-title">
    <div className="join-card__brand"><ListChecks size={20} /> CoShop</div>
    <div className="join-card__icon"><ShieldCheck size={30} /></div>
    <h1 id="join-title">Join “{preview.listName}”</h1>
    <div className="join-card__scope">{preview.role === 'editor' ? <Pencil size={17} /> : <Eye size={17} />}<div><strong>{preview.role === 'editor' ? 'Can edit' : 'View only'}</strong><span>{preview.role === 'editor' ? 'You can add, change, and check off items on this list.' : 'You can see this list but cannot change its items.'}</span></div></div>
    <p className="join-card__expiry">Invitation expires {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(preview.expiresAt))}.</p>
    {!session ? <><p>Sign in to claim this invitation. CoShop will preserve any lists already on this device, and the inviter will not receive your email or phone number.</p><AuthForm redirectTo={window.location.href} onNotice={setNotice} /></> : <><p>You are signed in as <strong>{session.user.email ?? maskPhone(session.user.phone)}</strong>. Only this shopping list will be shared.</p><button className="btn-primary join-card__accept" disabled={joining} onClick={() => void accept()}><Check size={17} /> {joining ? 'Joining list…' : `Join as ${preview.role}`}</button></>}
    {notice && <p className="account-panel__feedback" role="status">{notice}</p>}
    <a className="join-card__decline" href="/">Not now — open my lists</a>
  </section></main>;
}

const maskPhone = (phone?: string) => phone ? `${phone.slice(0, 3)}••••${phone.slice(-3)}` : 'a verified account';
