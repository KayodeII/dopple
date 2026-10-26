import { expect, test } from '@playwright/test';
import { collectErrors, signIn } from './helpers';

// Fees with the API's fake payment provider (PAYMENT_PROVIDER=fake): paying needs no money.
test('an admin bills a fee and the student pays it', async ({ browser }) => {
  const description = `E2E trip ${Date.now()}`;

  const admin = await browser.newPage();
  const adminErrors = collectErrors(admin);
  await signIn(admin, 'admin');
  await admin.getByRole('link', { name: 'Fees' }).click();
  await expect(
    admin.getByRole('heading', { level: 1, name: 'Fees' }),
  ).toBeVisible();

  // The first run sets up payments; later runs find them already on.
  const setUp = admin.getByRole('button', { name: 'Set up online payments' });
  const taking = admin.getByText(/Taking payments online/);
  await expect(setUp.or(taking)).toBeVisible();
  if (await setUp.isVisible()) await setUp.click();
  await expect(taking).toBeVisible();

  await admin.getByRole('button', { name: 'Bill a fee' }).click();
  await admin.getByLabel('What it is for').fill(description);
  await admin.getByLabel('Amount (₦)').fill('2,500');
  await admin
    .getByLabel('Who pays')
    .selectOption({ label: 'Adebayo, Tolu (GF-001)' });
  await admin.getByRole('button', { name: 'Bill fee' }).click();
  const row = admin.getByRole('row').filter({ hasText: description });
  await expect(row).toContainText('₦2,500');
  await expect(row).toContainText('Unpaid');
  expect(adminErrors).toEqual([]);

  const student = await browser.newPage();
  const studentErrors = collectErrors(student);
  await signIn(student, 'student');
  await student.getByRole('link', { name: 'Fees' }).click();
  const fee = student.getByRole('listitem').filter({ hasText: description });
  await fee.getByRole('button', { name: 'Pay ₦2,500' }).click();

  await expect(student).toHaveURL(/\/fees\?paid=/);
  await expect(student.getByRole('status')).toContainText('Thank you');
  await expect(fee).toContainText('Paid');
  await expect(fee.getByRole('button')).toHaveCount(0);
  expect(studentErrors).toEqual([]);

  await admin.reload();
  await expect(row).toContainText('Paid');
});
