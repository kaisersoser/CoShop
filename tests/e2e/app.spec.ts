import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('coshop'); });
  await page.reload();
});

test('guest creates and completes a list without signup', async ({ page }) => {
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

test('backup panel communicates the active deployment mode', async ({ page }) => {
  await page.getByRole('button', { name: 'Backup, account, and sharing' }).click();
  if (new URL(page.url()).hostname.endsWith('vercel.app')) {
    await expect(page.getByLabel('Email for a secure sign-in link')).toBeVisible();
  } else {
    await expect(page.getByText('Local mode')).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy.html');
});
