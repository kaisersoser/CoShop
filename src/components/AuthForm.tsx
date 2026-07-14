import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { phoneAuthEnabled, supabase, whatsappOtpEnabled } from '../lib/supabase';
import { useI18n } from '../i18n';

interface Props { redirectTo?: string; onNotice: (message: string) => void; }
type PhoneChannel = 'sms' | 'whatsapp';

export function AuthForm({ redirectTo = window.location.href, onNotice }: Props) {
  const { t } = useI18n();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState<PhoneChannel>('sms');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const validPhone = /^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ''));

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendEmail = async () => {
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    onNotice(error ? error.message : t('checkEmail'));
    setBusy(false);
  };

  const sendPhoneCode = async () => {
    if (!supabase || !validPhone || cooldown) return;
    setBusy(true);
    const normalized = phone.replace(/[\s()-]/g, '');
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized, options: { channel } });
    if (error) onNotice(error.message);
    else { setPhone(normalized); setCodeSent(true); setCooldown(30); onNotice(t('codeSent', { channel: channel === 'sms' ? 'SMS' : 'WhatsApp' })); }
    setBusy(false);
  };

  const verifyPhoneCode = async () => {
    if (!supabase || code.trim().length < 4) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
    onNotice(error ? error.message : t('phoneVerified'));
    setBusy(false);
  };

  return <div className="auth-form">
    {phoneAuthEnabled && <div className="auth-form__tabs" role="tablist" aria-label={t('signInMethod')}>
      <button role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'auth-form__tab--active' : ''} onClick={() => setMethod('email')}><Mail size={15} /> {t('email')}</button>
      <button role="tab" aria-selected={method === 'phone'} className={method === 'phone' ? 'auth-form__tab--active' : ''} onClick={() => setMethod('phone')}><Phone size={15} /> {t('phone')}</button>
    </div>}
    {method === 'email' ? <div className="account-panel__section">
      <label className="composer__label" htmlFor="account-email">{t('emailSignIn')}</label>
      <div className="account-panel__row"><input id="account-email" className="field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><button className="btn-primary" disabled={!email.trim() || busy} onClick={() => void sendEmail()}><Mail size={16} /> {t('sendLink')}</button></div>
    </div> : <div className="account-panel__section">
      <label className="composer__label" htmlFor="account-phone">{t('mobileNumber')}</label>
      <input id="account-phone" className="field" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setCodeSent(false); }} placeholder="+33 6 12 34 56 78" aria-describedby="phone-help" />
      <small id="phone-help">{t('phoneSignInPrivacy')}</small>
      {whatsappOtpEnabled && <div className="auth-form__channel"><label><input type="radio" name="otp-channel" checked={channel === 'sms'} onChange={() => setChannel('sms')} /> SMS</label><label><input type="radio" name="otp-channel" checked={channel === 'whatsapp'} onChange={() => setChannel('whatsapp')} /> WhatsApp</label></div>}
      {!codeSent ? <button className="btn-primary" disabled={!validPhone || busy || cooldown > 0} onClick={() => void sendPhoneCode()}><MessageCircle size={16} /> {cooldown ? t('resendIn', { seconds: cooldown }) : t('sendCode', { channel: channel === 'sms' ? 'SMS' : 'WhatsApp' })}</button> : <div className="account-panel__row"><input className="field" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder={t('verificationCode')} aria-label={t('verificationCode')} /><button className="btn-primary" disabled={code.length < 4 || busy} onClick={() => void verifyPhoneCode()}>{t('verify')}</button></div>}
      {codeSent && <button className="btn-ghost auth-form__resend" disabled={busy || cooldown > 0} onClick={() => void sendPhoneCode()}>{cooldown ? t('resendAvailable', { seconds: cooldown }) : t('sendAnotherCode')}</button>}
    </div>}
  </div>;
}
