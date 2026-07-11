export const REGIONS = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['FR', 'France'],
  ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'], ['CH', 'Switzerland'],
  ['AU', 'Australia'], ['NZ', 'New Zealand'], ['JP', 'Japan'],
] as const;

export const LANGUAGES = [['en', 'English']] as const;

export const CURRENCIES = [
  ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['CAD', 'Canadian Dollar'],
  ['AUD', 'Australian Dollar'], ['NZD', 'New Zealand Dollar'], ['CHF', 'Swiss Franc'], ['JPY', 'Japanese Yen'],
] as const;

export const preferenceLocale = (language: string, region: string) => `${language}-${region}`;
