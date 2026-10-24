import { expect, test, type Page } from '@playwright/test';
import { collectErrors, greetingHeading, signIn } from './helpers';

test.describe('as a student', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let errors: string[];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    errors = collectErrors(page);
    await signIn(page, 'student');
    await expect(greetingHeading(page)).toBeVisible();
  });

  test.afterAll(async () => {
    expect(errors).toEqual([]);
    await page.close();
  });

  test('sees only their own pages', async () => {
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveText([
      'Home',
      'Timetable',
      'Fees',
      'Settings',
    ]);
    await expect(page.getByRole('region', { name: 'Today' })).toBeVisible();
  });

  test('sees their class timetable with each subject’s teacher', async () => {
    await page.getByRole('link', { name: 'Timetable', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Timetable', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(15);
    await expect(page.getByRole('region', { name: 'Monday' })).toContainText(
      'Demo Teacher',
    );
  });

  test('picks their own theme, which survives a reload', async () => {
    const theme = () =>
      page.evaluate(() => document.documentElement.dataset.theme);
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible();
    // School branding is for admins only.
    await expect(page.getByRole('region', { name: 'Logo' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: /^Light/ })).toBeChecked();
    expect(await theme()).toBe('light');

    await page.getByRole('radio', { name: /^Dark/ }).check();
    expect(await theme()).toBe('dark');
    await page.reload();
    await expect(page.getByRole('radio', { name: /^Dark/ })).toBeChecked();
    expect(await theme()).toBe('dark');

    await page.getByRole('radio', { name: /^Light/ }).check();
    expect(await theme()).toBe('light');
  });

  test('gets "Staff only" for staff pages', async () => {
    await page.goto('/students');
    await expect(
      page.getByRole('heading', { name: 'Staff only' }),
    ).toBeVisible();
  });
});
