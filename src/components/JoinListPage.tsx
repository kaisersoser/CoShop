import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Check, Eye, ListChecks, Pencil, ShieldCheck } from 'lucide-react';
import { cloudConfigured, supabase } from '../lib/supabase';
import { acceptListInvite, previewListInvite, type ListInvitePreview } from '../lib/sharing';
import { useShopStore } from '../store/store';
import { AuthForm } from './AuthForm';
import './JoinListPage.css';
import { useI18n } from '../i18n';

export function JoinListPage({ token }: { token: string }) {
  const [preview, setPreview] = useState<ListInvitePreview | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState('');
  const [joining, setJoining] = useState(false);
  const { locale, t } = useI18n();

  useEffect(() => {
    if (!supabase) { setPreview(null); return; }
    void previewListInvite(token).then(setPreview).catch((error) => { setPreview(null); setNotice(error instanceof Error ? error.message : t('checkInviteError')); });
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
    } catch (error) { setNotice(error instanceof Error ? error.message : t('acceptInviteError')); setJoining(false); }
  };

  if (preview === undefined) return <main className="join-page"><div className="join-card surface-raised" role="status">{t('checkingInvitation')}</div></main>;
  if (!cloudConfigured || !preview || !preview.valid) return <main className="join-page"><section className="join-card surface-raised"><ListChecks size={30} /><h1>{t('invitationUnavailable')}</h1><p>{notice || t('invalidInvitation')}</p><a className="btn-ghost" href="/"><ArrowLeft size={16} /> {t('openCoShop')}</a></section></main>;

  return <main className="join-page"><section className="join-card surface-raised" aria-labelledby="join-title">
    <div className="join-card__brand"><ListChecks size={20} /> CoShop</div>
    <div className="join-card__icon"><ShieldCheck size={30} /></div>
    <h1 id="join-title">{t('invitedTo', { name: preview.listName })}</h1>
    <div className="join-card__scope">{preview.role === 'editor' ? <Pencil size={17} /> : <Eye size={17} />}<div><strong>{t(preview.role === 'editor' ? 'canEdit' : 'viewOnly')}</strong><span>{t(preview.role === 'editor' ? 'canEditHelp' : 'viewOnlyHelp')}</span></div></div>
    <p className="join-card__expiry">{t('invitationExpires', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(preview.expiresAt)) })}</p>
    {!session ? <><p>{t('claimInvite')}</p><AuthForm redirectTo={window.location.href} onNotice={setNotice} /></> : <><p>{t('signedInAs', { account: session.user.email ?? maskPhone(session.user.phone, t('verifiedAccount')) })}</p><button className="btn-primary join-card__accept" disabled={joining} onClick={() => void accept()}><Check size={17} /> {joining ? t('joining') : t('joinAs', { role: t(preview.role === 'editor' ? 'roleEditor' : 'roleViewer') })}</button></>}
    {notice && <p className="account-panel__feedback" role="status">{notice}</p>}
    <a className="join-card__decline" href="/">{t('notNow')}</a>
  </section></main>;
}

const maskPhone = (phone: string | undefined, fallback: string) => phone ? `${phone.slice(0, 3)}••••${phone.slice(-3)}` : fallback;
