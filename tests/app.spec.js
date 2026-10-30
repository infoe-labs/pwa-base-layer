import { test, expect } from '@playwright/test';
const base = process.env.BASE_PATH || '/';

test('saves locally, reloads offline, deletes data and leaves other apps untouched', async ({ page, context }) => {
  const thirdParty = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') thirdParty.push(request.url());
  });
  await page.goto(base);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    localStorage.setItem('unrelated-app', 'keep');
    const cache = await caches.open('unrelated-cache');
    await cache.put('/unrelated', new Response('keep'));
  });
  await page.getByLabel('Your note').fill('Synthetic offline fixture');
  await page.getByRole('button', { name: 'Save on device' }).click();
  await expect(page.getByRole('status')).toContainText('Saved on this device');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Your note')).toHaveValue('Synthetic offline fixture');
  await page.getByRole('button', { name: 'Delete demo data' }).click();
  await expect(page.getByRole('status')).toContainText('Demo data deleted');
  await expect(page.getByLabel('Your note')).toHaveValue('');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-app'))).toBe('keep');
  expect(await page.evaluate(() => caches.has('unrelated-cache'))).toBe(true);
  await page.reload();
  await expect(page.getByLabel('Your note')).toHaveValue('');
  expect(thirdParty).toEqual([]);
});

test('manifest and Apple install metadata respect the deployment subpath', async ({ page, request }) => {
  await page.goto(base);
  const manifest = await (await request.get(`${base}manifest.webmanifest`)).json();
  expect(manifest.start_url).toBe(base);
  expect(manifest.scope).toBe(base);
  expect(manifest.id).toBe(base);
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(base + icon.src)).ok()).toBe(true);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', base + 'apple-touch-icon.png');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.getByText('iPhone / iPad:', { exact: false })).toBeVisible();
});

test('Android install prompt is offered only after a browser event and user gesture', async ({ page }) => {
  await page.goto(base);
  await expect(page.getByRole('button', { name: 'Install app', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    window.promptCount = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.promptCount++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
  await expect(page.getByRole('button', { name: 'Install app', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.promptCount)).toBe(0);
  await page.getByRole('button', { name: 'Install app', exact: true }).click();
  expect(await page.evaluate(() => window.promptCount)).toBe(1);
});

test('mobile layout has no horizontal overflow and installed mode hides install guidance', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto(base);
  await expect(page.getByText('Running as an installed app')).toBeVisible();
  await expect(page.getByText('Add to Home Screen', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('updates wait for consent and protect an unsaved draft', async ({ page }) => {
  const { readFile, writeFile } = await import('node:fs/promises');
  const workerPath = new URL('../dist/sw.js', import.meta.url);
  const original = await readFile(workerPath, 'utf8');
  await page.goto(base);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  try {
    await page.getByLabel('Your note').fill('Synthetic draft');
    await writeFile(workerPath, original + '\n// Synthetic update fixture\n');
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.update(); });
    const update = page.getByRole('button', { name: 'Update and reload' });
    await expect(update).toBeVisible();
    await expect(update).toBeDisabled();
    await page.getByRole('button', { name: 'Save on device' }).click();
    await expect(update).toBeEnabled();
    await Promise.all([page.waitForEvent('load'), update.click()]);
    await expect(page.getByLabel('Your note')).toHaveValue('Synthetic draft');
    await expect(update).toHaveCount(0);
  } finally { await writeFile(workerPath, original); }
});

test('storage denial preserves unsaved input and gives generic feedback', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: null }));
  await page.goto(base);
  await expect(page.getByRole('status')).toContainText('Local storage is unavailable');
  await page.getByLabel('Your note').fill('Synthetic unsaved fixture');
  await page.getByRole('button', { name: 'Save on device' }).click();
  await expect(page.getByRole('status')).toContainText('Could not save');
  await expect(page.getByLabel('Your note')).toHaveValue('Synthetic unsaved fixture');
});

test('unlisted requests never become available offline through runtime caching', async ({ page, context }) => {
  await page.goto(base);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await fetch(new URL('unlisted-resource?synthetic=1', location.href));
  });
  await context.setOffline(true);
  const cached = await page.evaluate(async () => {
    try { await fetch(new URL('unlisted-resource?synthetic=1', location.href)); return true; }
    catch { return false; }
  });
  expect(cached).toBe(false);
});
