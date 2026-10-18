import { expect, test } from '@playwright/test';

/**
 * Dopple Learn (ADR 0011): pick a class, open a lesson, practise. Needs the API with
 * Learn content loaded (pnpm learn:load).
 */
test('a learner finds a lesson and practises, without signing up', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('link', { name: 'Learn free' }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /Learn for free/ }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The exams ahead' })).toBeVisible();

  await page.getByRole('link', { name: /^JSS 1/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'JSS 1' })).toBeVisible();
  await page.getByRole('link', { name: /Factors, multiples, HCF and LCM/ }).click();
  await expect(page).toHaveURL(/\/learn\/jss-1\/hcf-and-lcm$/);

  const first = page.getByRole('group', { name: /NOT a factor of 18/ });
  await first.getByText('3', { exact: true }).click();
  await expect(first.getByText(/Not quite: the answer is C\./)).toBeVisible();

  // Answer the rest correctly: the score and a best score appear.
  const answers = ['6', '12', '24', '12', '2² × 3 × 5'];
  for (const [i, answer] of answers.entries()) {
    await page
      .getByRole('group')
      .nth(i + 1)
      .getByText(answer, { exact: true })
      .click();
  }
  await expect(page.getByRole('status')).toHaveText('You got 5 of 6.');
  await expect(page.getByText('Your best: 5 of 6')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Your best: 5 of 6')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('a class or lesson that does not exist says so', async ({ page }) => {
  await page.goto('/learn/form-9');
  await expect(page.getByText('This page could not be found.')).toBeVisible();
  await page.goto('/learn/primary-2/equivalent-fractions');
  await expect(page.getByText('This page could not be found.')).toBeVisible();
});
