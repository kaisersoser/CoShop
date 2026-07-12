import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Check, Cloud, CloudOff, Download, Globe2, Languages, LogOut, RefreshCw, Settings, WalletCards, X } from 'lucide-react';
import { startCloudSync, syncNow, watchSync, type SyncState } from '../lib/cloudSync';
import { cloudConfigured, supabase } from '../lib/supabase';
import { selectActiveList, useShopStore } from '../store/store';
import { CURRENCIES, LANGUAGES, REGIONS, REGION_DEFAULTS, localizedCurrencyName, localizedRegionName } from '../data/preferences';
import { AuthForm } from './AuthForm';
import { useI18n } from '../i18n';
import './SettingsPanel.css';
import { Dialog } from './Dialog';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncState>('guest');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const preferences = useShopStore((state) => state.preferences);
  const updatePreferences = useShopStore((state) => state.updatePreferences);
  const activeList = useShopStore(selectActiveList);
  const setListCurrency = useShopStore((state) => state.setListCurrency);
  const canChangeListCurrency = activeList?.accessRole !== 'viewer';
  const { language, t } = useI18n();

  useEffect(() => {
    const stopWatch = watchSync((next, detail) => { setStatus(next); setMessage(detail ?? ''); });
    if (!supabase) return () => { stopWatch(); };
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); void startCloudSync(data.session); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); void startCloudSync(next); });
    return () => { data.subscription.unsubscribe(); stopWatch(); };
  }, []);

  const exportData = () => {
    const state = useShopStore.getState();
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, lists: state.lists, itemsByList: state.itemsByList, stores: state.stores, preferences: state.preferences }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `coshop-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  const changeCurrency = (currency: string) => {
    updatePreferences({ defaultCurrency: currency });
    if (activeList && canChangeListCurrency) setListCurrency(activeList.id, currency);
  };

  const changeRegion = (region: string) => {
    const defaults = REGION_DEFAULTS[region];
    updatePreferences({ region, ...(defaults ? { defaultCurrency: defaults.currency, ...(defaults.language ? { language: defaults.language } : {}) } : {}) });
    if (defaults && activeList && canChangeListCurrency) setListCurrency(activeList.id, defaults.currency);
  };

  return <Dialog className="settings-panel" onClose={onClose} labelledBy="settings-title" initialFocusRef={closeRef}>
      <div className="modal__head"><h3 id="settings-title"><Settings size={19} /> {t('settings')}</h3><button ref={closeRef} className="icon-btn" onClick={onClose} aria-label={t('close')}><X size={18} /></button></div>

      <section className="settings-section" aria-labelledby="regional-heading">
        <div className="settings-section__heading"><Globe2 size={17} /><div><h4 id="regional-heading">{t('regionFormatting')}</h4><p>{t('regionHelp')}</p></div></div>
        <div className="settings-field"><label htmlFor="settings-region">{t('region')}</label><select id="settings-region" className="field" value={preferences.region} onChange={(event) => changeRegion(event.target.value)}>{REGIONS.map(([value, label]) => <option key={value} value={value}>{localizedRegionName(language, value, label)}</option>)}</select></div>
        <div className="settings-field"><label htmlFor="settings-language"><Languages size={14} /> {t('language')}</label><select id="settings-language" className="field" value={preferences.language} onChange={(event) => updatePreferences({ language: event.target.value })}>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{t('languageHelp')}</small></div>
        <div className="settings-field"><label htmlFor="settings-currency"><WalletCards size={14} /> {t('currency')}</label><select id="settings-currency" className="field" value={canChangeListCurrency ? activeList?.currency ?? preferences.defaultCurrency : preferences.defaultCurrency} onChange={(event) => changeCurrency(event.target.value)}>{CURRENCIES.map(([value, label]) => <option key={value} value={value}>{value} — {localizedCurrencyName(language, value, label)}</option>)}</select><small>{t(canChangeListCurrency ? 'currencyEditableHelp' : 'currencyViewHelp')}</small></div>
      </section>

      <section className="settings-section" aria-labelledby="backup-heading">
        <div className="settings-section__heading"><Cloud size={17} /><div><h4 id="backup-heading">{t('accountBackup')}</h4><p>{t('accountHelp')}</p></div></div>
        {!cloudConfigured ? <div className="account-panel__notice"><CloudOff size={18} /><div><strong>{t('localMode')}</strong><span>{t('localModeHelp')}</span></div></div>
        : !session ? <AuthForm redirectTo={window.location.origin} onNotice={setNotice} />
        : <><div className="account-panel__identity"><Check size={16} /><div><strong>{t('automaticBackup')}</strong><span>{session.user.email ?? maskPhone(session.user.phone, t('verifiedAccount'))}</span></div><button className="btn-ghost" onClick={() => supabase?.auth.signOut()}><LogOut size={14} /> {t('signOut')}</button></div><div className="account-panel__status" role="status"><span className={`sync-dot sync-dot--${status}`} /><span>{status === 'syncing' ? t('syncing') : status === 'synced' ? message || t('backedUp') : message || t('readySync')}</span><button className="icon-btn" onClick={() => void syncNow()} aria-label={t('syncNow')}><RefreshCw size={15} /></button></div></>}
        {notice && <p className="account-panel__feedback" role="status">{notice}</p>}
      </section>

      <section className="settings-section" aria-labelledby="data-heading">
        <div className="settings-section__heading"><Download size={17} /><div><h4 id="data-heading">{t('yourData')}</h4><p>{t('dataHelp')}</p></div></div>
        <div className="account-panel__export"><div><strong>{t('downloadExport')}</strong><span>{t('exportIncludes')} <a href="/privacy.html" target="_blank" rel="noreferrer">{t('privacyNotice')}</a></span></div><button className="btn-ghost" onClick={exportData}><Download size={15} /> {t('export')}</button></div>
      </section>
  </Dialog>;
}

const maskPhone = (phone: string | undefined, fallback: string) => phone ? `${phone.slice(0, 3)}••••${phone.slice(-3)}` : fallback;
