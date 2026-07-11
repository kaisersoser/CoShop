import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('coshop'); });
  await page.reload();
});

test('guest creates and completes a list without signup', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Welcome to CoShop' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your list is empty' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add my first item' }).click();
  await page.getByPlaceholder('Search products, e.g. bananas').fill('My exact oat milk');
  await page.getByRole('button', { name: 'Add to list' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('My exact oat milk')).toBeVisible();
  await page.getByRole('button', { name: 'Mark as purchased' }).click();
  await expect(page.getByLabel('1 of 1 items purchased')).toBeVisible();
});

test('core first-run view has no serious accessibility violations', async ({ page }) => {
  const firstRun = await new AxeBuilder({ page }).analyze();
  expect(firstRun.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Add my first item' }).click();
  const composer = await new AxeBuilder({ page }).analyze();
  expect(composer.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('installed shell starts while offline', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('CoShop', { exact: true })).toBeVisible();
});

test('settings consolidates regional, backup, and data controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Region & formatting' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account & backup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible();
  if (new URL(page.url()).hostname.endsWith('vercel.app')) {
    await expect(page.getByLabel('Email for a secure sign-in link')).toBeVisible();
  } else {
    await expect(page.getByText('Local mode')).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy.html');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('regional and currency settings persist', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Region', { exact: true }).selectOption('FR');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('#settings-language')).toHaveValue('fr');
  await expect(page.locator('#settings-currency')).toHaveValue('EUR');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ouvrir les paramètres' }).click();
  await expect(page.locator('#settings-region')).toHaveValue('FR');
  await expect(page.locator('#settings-currency')).toHaveValue('EUR');
});

test('European market presets localize the interface and currency', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click();
  const region = page.locator('#settings-region');
  const language = page.locator('#settings-language');
  const currency = page.locator('#settings-currency');

  await region.selectOption('DE');
  await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();
  await expect(language).toHaveValue('de');
  await expect(currency).toHaveValue('EUR');

  await region.selectOption('ES');
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
  await expect(language).toHaveValue('es');
  await expect(currency).toHaveValue('EUR');

  await region.selectOption('GB');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(language).toHaveValue('en');
  await expect(currency).toHaveValue('GBP');
});

test('every region automatically selects a readable currency option', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings' }).click();
  const region = page.locator('#settings-region');
  const currency = page.locator('#settings-currency');
  const expected = { US: 'USD', CA: 'CAD', GB: 'GBP', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', CH: 'CHF', AU: 'AUD', NZ: 'NZD', JP: 'JPY' };

  for (const [regionCode, currencyCode] of Object.entries(expected)) {
    await region.selectOption(regionCode);
    await expect(currency).toHaveValue(currencyCode);
  }

  const colors = await currency.locator('option').first().evaluate((option) => {
    const style = getComputedStyle(option);
    return { color: style.color, background: style.backgroundColor };
  });
  expect(colors).toEqual({ color: 'rgb(7, 17, 13)', background: 'rgb(240, 253, 244)' });
});

test('PDF import explains local parsing and AI privacy before upload', async ({ page }) => {
  await page.getByRole('button', { name: 'Import PDF' }).click();
  await expect(page.getByRole('heading', { name: 'Import shopping invoice' })).toBeVisible();
  await expect(page.getByText('It is read on this device', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Imported item language')).toHaveValue('en');
  await expect(page.getByText('PDF only · up to 10 MB and 20 pages')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('PDF import remains visible after first-run guidance is dismissed', async ({ page }) => {
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('heading', { name: 'Your list is empty' })).toBeVisible();
  await page.getByRole('button', { name: 'Import PDF' }).click();
  await expect(page.getByRole('heading', { name: 'Import shopping invoice' })).toBeVisible();
});

test('list sharing names its scope without requesting contacts', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Share current list' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Share current list' }).click();
  await expect(page.getByRole('heading', { name: /Share “.+”/ })).toBeVisible();
  await expect(page.getByText('CoShop will not request your contacts or see who you message.')).toBeVisible();
  if (new URL(page.url()).hostname.endsWith('vercel.app')) await expect(page.getByLabel('Email for a secure sign-in link')).toBeVisible();
  else await expect(page.getByText('Cloud sharing is not configured for this deployment.')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('invalid invitation reveals no list contents', async ({ page }) => {
  await page.goto('/join/not-a-real-token');
  await expect(page.getByRole('heading', { name: 'Invitation unavailable' })).toBeVisible();
  await expect(page.getByText('invalid, expired, revoked, or has already been used', { exact: false })).toBeVisible();
});
