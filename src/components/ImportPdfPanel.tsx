import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Check, FileText, FileUp, ShieldCheck, Tags, X } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { LANGUAGES } from '../data/preferences';
import { useI18n } from '../i18n';
import type { ImportedProduct, ImportLanguage, ParsedInvoice } from '../lib/importTypes';
import { supabase } from '../lib/supabase';
import { useShopStore } from '../store/store';
import './ImportPdfPanel.css';
import { Dialog } from './Dialog';

interface Props { onClose: () => void; onImported: () => void; }
const DRAFT_KEY = 'coshop-pdf-import-draft';
interface ImportDraft { invoice: ParsedInvoice; listName: string; language: ImportLanguage; includePrices: boolean; }
const savedDraft = (): ImportDraft | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as ImportDraft | null;
    return value?.invoice?.products?.length ? value : null;
  } catch { return null; }
};

export function ImportPdfPanel({ onClose, onImported }: Props) {
  const { categoryLabel, locale, t } = useI18n();
  const preferences = useShopStore((state) => state.preferences);
  const importList = useShopStore((state) => state.importList);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [restored] = useState(savedDraft);
  const [invoice, setInvoice] = useState<ParsedInvoice | null>(restored?.invoice ?? null);
  const [listName, setListName] = useState(restored?.listName ?? '');
  const [language, setLanguage] = useState<ImportLanguage>(restored?.language ?? ((['en', 'fr', 'de', 'es'] as string[]).includes(preferences.language) ? preferences.language as ImportLanguage : 'original'));
  const [includePrices, setIncludePrices] = useState(restored?.includePrices ?? true);
  const [busy, setBusy] = useState<'parse' | 'ai' | null>(null);
  const [progress, setProgress] = useState({ page: 0, total: 0 });
  const [notice, setNotice] = useState('');
  const [aiComplete, setAiComplete] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (invoice) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ invoice, listName, language, includePrices } satisfies ImportDraft));
  }, [invoice, listName, language, includePrices]);

  const selected = useMemo(() => invoice?.products.filter((item) => item.selected) ?? [], [invoice]);
  const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: invoice?.currency ?? preferences.defaultCurrency }).format(value);

  const updateProduct = (id: string, patch: Partial<ImportedProduct>) => setInvoice((current) => current ? { ...current, products: current.products.map((item) => item.id === id ? { ...item, ...patch } : item) } : current);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setBusy('parse'); setNotice(''); setInvoice(null); setAiComplete(false); setProgress({ page: 0, total: 0 });
    try {
      const { parseInvoicePdf } = await import('../lib/pdfImport');
      const parsed = await parseInvoicePdf(file, (page, total) => setProgress({ page, total }));
      setInvoice(parsed);
      setListName(parsed.invoiceDate ? `${parsed.retailer} · ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${parsed.invoiceDate}T12:00:00`))}` : parsed.suggestedListName);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'This PDF could not be read.'); }
    finally { setBusy(null); if (inputRef.current) inputRef.current.value = ''; }
  };

  const enrich = async () => {
    if (!invoice || !session) return;
    setBusy('ai'); setNotice(''); setAiComplete(false);
    try {
      const { enrichProducts } = await import('../lib/pdfImport');
      const enriched = await enrichProducts(invoice.products, language, session.access_token);
      const byId = new Map(enriched.map((item) => [item.id, item]));
      setInvoice({ ...invoice, products: invoice.products.map((item) => {
        const result = byId.get(item.id); return result ? { ...item, name: result.name, category: result.category, confidence: result.confidence } : item;
      }) });
      setAiComplete(true); setNotice(t('aiComplete'));
    } catch (error) { setNotice(error instanceof Error ? error.message : 'AI enrichment failed.'); }
    finally { setBusy(null); }
  };

  const commit = () => {
    if (!invoice || !selected.length) { setNotice(t('noProductsSelected')); return; }
    importList({ name: listName, currency: invoice.currency, storeName: invoice.retailer, items: selected.map((item) => ({
      name: item.name.trim() || item.originalName, catalogId: `ean:${item.ean13}`, category: item.category,
      quantity: item.quantity, price: includePrices ? item.unitPrice : undefined,
    })) });
    sessionStorage.removeItem(DRAFT_KEY);
    onImported();
  };

  const changeLanguage = (next: ImportLanguage) => {
    setLanguage(next); setAiComplete(false); setNotice('');
    setInvoice((current) => current ? { ...current, products: current.products.map((item) => ({ ...item, name: item.originalName, confidence: 'source' })) } : current);
  };

  return <Dialog className="import-panel" variant="wide" onClose={onClose} labelledBy="import-title" initialFocusRef={closeRef}>
      <div className="modal__head"><h3 id="import-title"><FileText size={19} /> {t('importInvoice')}</h3><button ref={closeRef} className="icon-btn" onClick={onClose} aria-label={t('close')}><X size={18} /></button></div>
      {!invoice ? <>
        <p className="import-panel__intro">{t('importIntro')}</p>
        <label className="settings-field"><span>{t('importLanguage')}</span><select className="field" value={language} onChange={(event) => changeLanguage(event.target.value as ImportLanguage)}><option value="original">{t('keepOriginal')}</option>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={(event) => void chooseFile(event.target.files?.[0])} />
        <button className="import-panel__drop" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}><FileUp size={30} /><strong>{busy === 'parse' ? t('parsingPdf', { page: progress.page, total: progress.total || '…' }) : t('choosePdf')}</strong><span>{t('pdfLimits')}</span></button>
      </> : <>
        <div className="import-panel__summary"><Check size={17} /><div><strong>{invoice.retailer}</strong><span>{t('importSummary', { products: invoice.products.length, units: invoice.declaredUnits ?? invoice.products.reduce((sum, item) => sum + item.quantity, 0), pages: invoice.pageCount })}</span></div></div>
        <label className="settings-field"><span>{t('importedListName')}</span><input className="field" value={listName} onChange={(event) => setListName(event.target.value)} /></label>
        <label className="settings-field"><span>{t('importLanguage')}</span><select className="field" value={language} onChange={(event) => changeLanguage(event.target.value as ImportLanguage)}><option value="original">{t('keepOriginal')}</option>{LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <section className="import-panel__ai"><div><Tags size={17} /><div><strong>{t('aiEnrichment')}</strong><p>{t('aiPrivacy')}</p></div></div>{session ? <button className="btn-primary" disabled={Boolean(busy)} onClick={() => void enrich()}><Tags size={16} /> {busy === 'ai' ? t('enrichingItems', { count: invoice.products.length }) : t(language === 'original' ? 'categorizeWithAi' : 'enrichWithAi')}</button> : <p className="import-panel__signin"><ShieldCheck size={15} /> {t('aiSignInRequired')}</p>}</section>
        {notice && <p className={`account-panel__feedback ${aiComplete ? 'import-panel__success' : ''}`} role="status">{notice}</p>}
        <div className="import-panel__select"><strong>{selected.length} / {invoice.products.length}</strong><button className="btn-ghost" onClick={() => setInvoice({ ...invoice, products: invoice.products.map((item) => ({ ...item, selected: true })) })}>{t('selectAll')}</button><button className="btn-ghost" onClick={() => setInvoice({ ...invoice, products: invoice.products.map((item) => ({ ...item, selected: false })) })}>{t('selectNone')}</button></div>
        <ul className="import-panel__products">{invoice.products.map((item) => <li key={item.id} className={!item.selected ? 'import-product--off' : ''}>
          <label className="import-product__check"><input type="checkbox" checked={item.selected} onChange={(event) => updateProduct(item.id, { selected: event.target.checked })} /><span className="sr-only">{item.name}</span></label>
          <div className="import-product__content"><input className="field" value={item.name} disabled={!item.selected} onChange={(event) => updateProduct(item.id, { name: event.target.value })} aria-label={item.originalName} /><div className="import-product__meta"><span>{t('productQuantity', { quantity: item.quantity })}</span>{includePrices && item.unitPrice !== undefined && <span>{t('historicalPrice', { price: money(item.unitPrice) })}</span>}<span>EAN {item.ean13}</span></div><select className="field import-product__category" value={item.category} disabled={!item.selected} onChange={(event) => updateProduct(item.id, { category: event.target.value as ImportedProduct['category'], confidence: 'high' })} aria-label={t('category')}>{CATEGORIES.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category.id)}</option>)}</select>{item.confidence === 'low' && <span className="import-product__warning">{t('confidenceLow')}</span>}</div>
        </li>)}</ul>
        <label className="import-panel__price"><input type="checkbox" checked={includePrices} onChange={(event) => setIncludePrices(event.target.checked)} /> {t('includePrices')}</label>
        <button className="btn-primary import-panel__commit" disabled={!selected.length || Boolean(busy)} onClick={commit}><FileUp size={17} /> {t('importSelected', { count: selected.length })}</button>
      </>}
      {notice && !invoice && <p className="account-panel__feedback" role="alert">{notice}</p>}
  </Dialog>;
}
