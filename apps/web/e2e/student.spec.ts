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
    await expect(nav.getByRole('link')).toHaveText(['Home', 'Timetable']);
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

  test('gets "Staff only" for staff pages', async () => {
    await page.goto('/students');
    await expect(
      page.getByRole('heading', { name: 'Staff only' }),
    ).toBeVisible();
  });
});
