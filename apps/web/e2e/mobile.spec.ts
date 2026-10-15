import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, greetingHeading, signIn } from './helpers';

test('works at phone width', async ({ page }) => {
  await signIn(page, 'student');
  await expect(greetingHeading(page)).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole('link', { name: 'Timetable', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(15);
  await expectNoSidewaysScroll(page);
});
