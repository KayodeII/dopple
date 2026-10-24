import { expect, test, type Page } from '@playwright/test';

/**
 * Log in → find your school, and Start your school. Needs the API with the seeded
 * demo schools. The school's own sign-in page is another app, so the last hop is
 * intercepted: we only check that the visitor is sent to the right address.
 */
const stubSchoolSignIn = (page: Page) =>
  page.route(
    /^https?:\/\/[a-z0-9-]+\.dopple\.localhost(:\d+)?\/sign-in/,
    (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<h1>School sign-in</h1>',
      }),
  );

test('Log in in the header opens "Find your school"', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'header links are desktop-only',
  );
  await page.goto('/');
  // Regression: the hero used to sit on top of the header and swallow this click.
  await page.getByRole('link', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Find your school' }),
  ).toBeVisible();
});

test('finds a school and goes to its own sign-in page', async ({ page }) => {
  await stubSchoolSignIn(page);
  await page.goto('/login');
  const search = page.getByRole('combobox', { name: 'School name or address' });
  await search.fill('river');
  const option = page.getByRole('option', { name: /Riverside Academy/ });
  await expect(option).toBeVisible();
  await expect(option).toContainText('Port Harcourt');

  await search.press('ArrowDown');
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(page).toHaveURL(
    /^https?:\/\/riverside\.dopple\.localhost(:\d+)?\/sign-in$/,
  );
});

test('says when no school matches, and offers to start one', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('combobox').fill('no school is called this');
  await expect(page.getByText('No school matches that.')).toBeVisible();
  await page.getByRole('link', { name: 'Start your school' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your school, on its own address' }),
  ).toBeVisible();
});

test('starts a school and sends the new admin to its sign-in page', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'one new school per run is enough',
  );
  await stubSchoolSignIn(page);
  await page.goto('/start');
  const name = `Playwright Prep ${Date.now().toString(36)}`;
  await page.getByLabel('School name').fill(name);

  // The address follows the name, and is checked against the API as you type.
  const address = page.getByLabel('Web address');
  const slug = name.toLowerCase().replaceAll(' ', '-');
  await expect(address).toHaveValue(slug);
  const isFree = page.getByText(new RegExp(`^${slug}\\..* is free$`));
  await expect(isFree).toBeVisible();

  await address.fill('greenfield');
  await expect(page.getByText(/greenfield\..* is already taken/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create my school' }),
  ).toBeDisabled();
  await address.fill(slug);
  await expect(isFree).toBeVisible();

  await page.getByLabel('Your name').fill('Pat Playwright');
  await page.getByLabel('Your email').fill('pat@example.test');
  await page.getByLabel('Password').fill('a-long-test-password');
  await page.getByRole('button', { name: 'Create my school' }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `^https?://${slug}\\.dopple\\.localhost(:\\d+)?/sign-in\\?email=pat%40example\\.test&welcome=1$`,
    ),
  );
});

test('login and start pages never scroll sideways', async ({ page }) => {
  for (const path of ['/login', '/start']) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
