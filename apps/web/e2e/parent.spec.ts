import { expect, test, type Page } from '@playwright/test';
import { collectErrors, greetingHeading, signIn } from './helpers';

// The seeded demo parent is Tolu Adebayo's mother (scripts/seed.mjs).
test.describe('as a parent', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let errors: string[];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    errors = collectErrors(page);
    await signIn(page, 'parent');
    await expect(greetingHeading(page)).toBeVisible();
  });

  test.afterAll(async () => {
    expect(errors).toEqual([]);
    await page.close();
  });

  test('sees their children on the home page', async () => {
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveText([
      'Home',
      'Timetable',
      'Fees',
      'Settings',
    ]);
    const children = page.getByRole('region', { name: 'Your children' });
    await expect(children.getByRole('listitem')).toHaveCount(1);
    await expect(children).toContainText('Tolu Adebayo');
    await expect(children).toContainText('JSS 1A');
  });

  test('sees their child’s class timetable', async () => {
    await page
      .getByRole('region', { name: 'Your children' })
      .getByRole('link', { name: 'Timetable' })
      .click();
    await expect(page.getByText('Tolu’s class, JSS 1A')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(15);
    await expect(page.getByRole('region', { name: 'Monday' })).toContainText(
      'Demo Teacher',
    );
  });

  test('sees their child’s fees', async () => {
    await page.getByRole('link', { name: 'Fees' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your children’s fees' }),
    ).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'First term tuition' }),
    ).toContainText('Tolu Adebayo');
  });

  test('reads their child’s record and answers for consent', async () => {
    await page.getByRole('link', { name: 'Home' }).click();
    await page
      .getByRole('region', { name: 'Your children' })
      .getByRole('link', { name: 'Record' })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Tolu Adebayo' }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Details' })).toContainText(
      'Ogun',
    );
    const consent = page.getByRole('region', { name: 'Your consent' });
    await expect(
      consent.getByRole('listitem').filter({ hasText: 'Health details' }),
    ).toContainText('Agreed · Demo Parent (Mother), on paper');

    const photo = consent
      .getByRole('listitem')
      .filter({ hasText: 'Passport photo' });
    await photo.getByRole('button', { name: 'I agree' }).click();
    await expect(photo).toContainText('Agreed · Demo Parent (Mother), online');
    await photo.getByRole('button', { name: 'Withdraw consent' }).click();
    await expect(photo).toContainText('erase the passport photo');
    await photo.getByRole('button', { name: 'Yes, withdraw' }).click();
    await expect(photo).toContainText('Said no · Demo Parent (Mother), online');
  });

  test('is told when a correction changes nothing', async () => {
    const correction = page.getByRole('region', {
      name: 'Ask for a correction',
    });
    await correction
      .getByRole('button', { name: 'Something is wrong' })
      .click();
    await correction
      .getByRole('button', { name: 'Send to the school' })
      .click();
    await expect(correction.getByRole('alert')).toHaveText(
      'Nothing has changed yet. Edit what is wrong first.',
    );
    await correction.getByRole('button', { name: 'Cancel' }).click();
  });

  test('gets "Staff only" for staff pages', async () => {
    await page.goto('/students');
    await expect(
      page.getByRole('heading', { name: 'Staff only' }),
    ).toBeVisible();
  });
});
