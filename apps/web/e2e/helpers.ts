import { expect, type Page } from '@playwright/test';

/** Signs in as a seeded Greenfield demo account (scripts/seed.mjs). */
export async function signIn(page: Page, who: 'admin' | 'teacher' | 'student') {
  if (!page.url().includes('/sign-in')) await page.goto('/');
  await page.getByLabel('Email').fill(`${who}@greenfield.test`);
  await page.getByLabel('Password', { exact: true }).fill('dopple-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export const greetingHeading = (page: Page) =>
  page.getByRole('heading', {
    level: 1,
    name: /^Good (morning|afternoon|evening), Demo\.$/,
  });

/** Page errors (not network 4xx, which the browser logs for the "am I signed in?" check). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
