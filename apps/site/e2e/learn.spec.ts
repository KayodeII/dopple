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

  // The lesson is numbered steps; worked examples reveal one step at a time.
  await expect(page.getByRole('heading', { level: 1, name: /HCF and LCM/ })).toBeVisible();
  const example = page.getByRole('figure').first();
  await expect(example.getByText(/^Step 1 of \d+$/)).toBeVisible();
  await example.getByRole('button', { name: /Show the next step/ }).click();
  await expect(example.getByText(/^Step 2 of \d+$/)).toBeVisible();
  await example.getByRole('button', { name: 'Show all steps' }).click();
  await expect(example.getByRole('button', { name: /Show the next step/ })).toHaveCount(0);

  // One question at a time, like a computer-based exam.
  const practice = page.getByRole('region', { name: 'Practise' });
  await expect(practice.getByText('Question 1 of 6')).toBeVisible();
  await practice.getByText('3', { exact: true }).click();
  await expect(practice.getByText('Not quite. The answer is C.')).toBeVisible();
  await practice.getByRole('button', { name: /^Next/ }).click();
  await expect(practice.getByText('Question 2 of 6')).toBeVisible();

  // Keys work as in a CBT exam: C answers, the right arrow moves on.
  await practice.getByRole('heading', { name: 'Find the HCF of 12 and 18.' }).press('c');
  await expect(practice.getByText('Correct')).toBeVisible();
  await page.keyboard.press('ArrowRight');

  for (const answer of ['12', '24', '12', '2² × 3 × 5']) {
    await practice.getByText(answer, { exact: true }).click();
    await practice.getByRole('button', { name: /^(Next|See my score)/ }).click();
  }
  await expect(practice.getByRole('status')).toHaveAccessibleName('5 out of 6');
  await expect(practice.getByText('Your best: 5 of 6')).toBeVisible();

  // The review grid goes back to a question, answer still showing.
  await practice.getByRole('button', { name: 'Go to question 1 (✗)' }).first().click();
  await expect(practice.getByText('Not quite. The answer is C.')).toBeVisible();
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
