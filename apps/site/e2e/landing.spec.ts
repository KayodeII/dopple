import { expect, test } from '@playwright/test';

test('landing page renders every section without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Your whole school',
  );
  for (const heading of [
    /running six/,
    /Four ways in/,
    /never drops/,
    /last bus home/,
    /one stop at a time/,
    /Six promises/,
    /Questions schools/,
    /Priced per student/,
    /Ready for the/,
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(
    page.getByRole('link', { name: "Book my school's demo" }).first(),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test('page never scrolls sideways', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('FAQ answers open and close', async ({ page }) => {
  await page.goto('/');
  const question = page.getByText('How do school fees reach our account?');
  await question.click();
  await expect(page.getByText('Dopple never holds it')).toBeVisible();
});
