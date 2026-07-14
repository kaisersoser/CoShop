export const REGIONS = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['FR', 'France'],
  ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'], ['CH', 'Switzerland'],
  ['AU', 'Australia'], ['NZ', 'New Zealand'], ['JP', 'Japan'],
] as const;

export const LANGUAGES = [
  ['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'],
] as const;

export const CURRENCIES = [
  ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['CAD', 'Canadian Dollar'],
  ['AUD', 'Australian Dollar'], ['NZD', 'New Zealand Dollar'], ['CHF', 'Swiss Franc'], ['JPY', 'Japanese Yen'],
] as const;

const REGION_NAMES: Record<string, Record<string, string>> = {
  fr: { US: 'États-Unis', CA: 'Canada', GB: 'Royaume-Uni', FR: 'France', DE: 'Allemagne', ES: 'Espagne', IT: 'Italie', CH: 'Suisse', AU: 'Australie', NZ: 'Nouvelle-Zélande', JP: 'Japon' },
  de: { US: 'Vereinigte Staaten', CA: 'Kanada', GB: 'Vereinigtes Königreich', FR: 'Frankreich', DE: 'Deutschland', ES: 'Spanien', IT: 'Italien', CH: 'Schweiz', AU: 'Australien', NZ: 'Neuseeland', JP: 'Japan' },
  es: { US: 'Estados Unidos', CA: 'Canadá', GB: 'Reino Unido', FR: 'Francia', DE: 'Alemania', ES: 'España', IT: 'Italia', CH: 'Suiza', AU: 'Australia', NZ: 'Nueva Zelanda', JP: 'Japón' },
};

const CURRENCY_NAMES: Record<string, Record<string, string>> = {
  fr: { USD: 'Dollar américain', EUR: 'Euro', GBP: 'Livre sterling', CAD: 'Dollar canadien', AUD: 'Dollar australien', NZD: 'Dollar néo-zélandais', CHF: 'Franc suisse', JPY: 'Yen japonais' },
  de: { USD: 'US-Dollar', EUR: 'Euro', GBP: 'Britisches Pfund', CAD: 'Kanadischer Dollar', AUD: 'Australischer Dollar', NZD: 'Neuseeland-Dollar', CHF: 'Schweizer Franken', JPY: 'Japanischer Yen' },
  es: { USD: 'Dólar estadounidense', EUR: 'Euro', GBP: 'Libra esterlina', CAD: 'Dólar canadiense', AUD: 'Dólar australiano', NZD: 'Dólar neozelandés', CHF: 'Franco suizo', JPY: 'Yen japonés' },
};

export const localizedRegionName = (language: string, code: string, fallback: string) => REGION_NAMES[language]?.[code] ?? fallback;
export const localizedCurrencyName = (language: string, code: string, fallback: string) => CURRENCY_NAMES[language]?.[code] ?? fallback;

export const preferenceLocale = (language: string, region: string) => `${language}-${region}`;

export const REGION_DEFAULTS: Record<string, { language?: string; currency: string }> = {
  US: { currency: 'USD' },
  CA: { currency: 'CAD' },
  GB: { language: 'en', currency: 'GBP' },
  FR: { language: 'fr', currency: 'EUR' },
  DE: { language: 'de', currency: 'EUR' },
  ES: { language: 'es', currency: 'EUR' },
  IT: { currency: 'EUR' },
  CH: { currency: 'CHF' },
  AU: { currency: 'AUD' },
  NZ: { currency: 'NZD' },
  JP: { currency: 'JPY' },
};

export const SUPPORTED_LANGUAGES = new Set(LANGUAGES.map(([value]) => value));

export const normalizeLanguage = (language?: string) =>
  language && SUPPORTED_LANGUAGES.has(language as (typeof LANGUAGES)[number][0]) ? language : 'en';

export const defaultListName = (language: string, region: string, date = new Date()): string => {
  const locale = preferenceLocale(normalizeLanguage(language), region);
  const formatted = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  if (language === 'fr') return `Courses du ${formatted}`;
  if (language === 'de') return `Einkauf ${formatted}`;
  if (language === 'es') return `Compra del ${formatted}`;
  return `${formatted} shopping`;
};
