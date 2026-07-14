import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const cloudConfigured = Boolean(url && key);
export const phoneAuthEnabled = import.meta.env.VITE_PHONE_AUTH_ENABLED === 'true';
export const whatsappOtpEnabled = phoneAuthEnabled && import.meta.env.VITE_WHATSAPP_OTP_ENABLED === 'true';
export const supabase = cloudConfigured
  ? createClient<Database>(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
