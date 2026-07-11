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
  await page.getByLabel('Currency', { exact: true }).selectOption('EUR');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByLabel('Region', { exact: true })).toHaveValue('FR');
  await expect(page.getByLabel('Currency', { exact: true })).toHaveValue('EUR');
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
