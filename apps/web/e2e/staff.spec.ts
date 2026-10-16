import { expect, test, type Page } from '@playwright/test';
import { collectErrors, greetingHeading, signIn } from './helpers';

test.describe('as the school admin', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let errors: string[];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    errors = collectErrors(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page.getByRole('heading', { name: 'Sign in to Greenfield College' }),
    ).toBeVisible();
    await signIn(page, 'admin');
    await expect(greetingHeading(page)).toBeVisible();
  });

  test.afterAll(async () => {
    expect(errors).toEqual([]);
    await page.close();
  });

  test('stays signed in across a reload, with the refresh token out of reach of scripts', async () => {
    await page.reload();
    await expect(greetingHeading(page)).toBeVisible();
    const cookies = await page.context().cookies();
    expect(
      cookies.find((c) => c.name === '__Host-dopple_refresh'),
    ).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
    });
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      'dopple_refresh',
    );
  });

  test('adds, finds and edits a student', async () => {
    const admissionNo = `E2E-${Date.now().toString(36).toUpperCase()}`;
    await page
      .getByRole('link', { name: 'Students', exact: true })
      .first()
      .click();
    await page.getByRole('button', { name: 'Add student' }).click();
    await page
      .getByLabel('Admission number', { exact: true })
      .fill(admissionNo);
    await page.getByLabel('First name').fill('Ngozi');
    await page.getByLabel('Last name').fill('Playwright');
    await page.getByRole('button', { name: 'Save student' }).click();

    await expect(
      page.getByRole('heading', { name: 'Ngozi Playwright' }),
    ).toBeVisible();
    await expect(page.getByText('Not in a class yet.')).toBeVisible();
    await page.getByRole('button', { name: 'Edit details' }).click();
    await page.getByLabel('First name').fill('Ngozika');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('heading', { name: 'Ngozika Playwright' }),
    ).toBeVisible();

    await page.getByRole('link', { name: '← All students' }).click();
    await page
      .getByLabel('Search by name or admission number')
      .fill(admissionNo);
    await expect(page.getByRole('row')).toHaveCount(2); // header + the match
    await expect(
      page.getByRole('link', { name: 'Playwright, Ngozika' }),
    ).toBeVisible();

    // The same admission number again is refused, with the API's message.
    await page.getByRole('button', { name: 'Add student' }).click();
    await page
      .getByLabel('Admission number', { exact: true })
      .fill(admissionNo);
    await page.getByLabel('First name').fill('Second');
    await page.getByLabel('Last name').fill('Copy');
    await page.getByRole('button', { name: 'Save student' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'A record with these details already exists',
    );
  });

  test('builds a class timetable and refuses overlapping lessons', async () => {
    await page
      .getByRole('link', { name: 'Classes', exact: true })
      .first()
      .click();
    await page.getByRole('link', { name: /JSS 1A/ }).click();
    await expect(
      page.getByRole('heading', { name: 'JSS 1A', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Monday' }).getByRole('article'),
    ).toHaveCount(3);

    const form = page.getByRole('form', { name: 'Add a lesson' });
    const addLesson = async (startsAt: string, endsAt: string) => {
      await form.getByLabel('Subject').selectOption({ label: 'Mathematics' });
      await form.getByLabel('Day').selectOption({ label: 'Saturday' });
      await form.getByLabel('Starts').fill(startsAt);
      await form.getByLabel('Ends').fill(endsAt);
      await form.getByRole('button', { name: 'Add lesson' }).click();
    };
    // The demo timetable is Monday to Friday, so Saturday is free.
    await addLesson('11:00', '11:40');
    const saturday = page.getByRole('region', { name: 'Saturday' });
    await expect(saturday.getByRole('article')).toHaveCount(1);
    await expect(saturday).toContainText('11:00–11:40');

    await addLesson('11:20', '12:00');
    await expect(form.getByRole('alert')).toHaveText(
      'This overlaps an existing record',
    );

    await saturday
      .getByRole('button', { name: /Remove Mathematics on Saturday/ })
      .click();
    await expect(saturday).toHaveCount(0);
  });

  test('brands the app in the school’s colours and logo, then goes back to the default', async () => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 1 }),
    ).toBeVisible();
    const cssColor = (name: string) => () =>
      page.evaluate(
        (name) =>
          getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim(),
        name,
      );
    const schoolColor = cssColor('--color-school');
    const accentColor = cssColor('--color-accent');

    // Without an accent, the main colour does both jobs.
    await page.getByLabel('Main colour hex').fill('#f5b400');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    expect(await schoolColor()).toBe('#f5b400');
    // Light colour: buttons switch to dark text so they stay readable.
    const onSchool = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-on-school')
        .trim(),
    );
    expect(onSchool).toBe('#0b0b0a');
    expect(await accentColor()).toBe('#f5b400');

    await page.getByLabel('Accent colour hex').fill('#2b5fd9');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(accentColor).toBe('#2b5fd9');
    expect(await schoolColor()).toBe('#f5b400');

    // A 1x1 PNG is enough to prove the upload, storage and display path.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
    await expect(
      page.getByRole('img', { name: 'Greenfield College logo' }).first(),
    ).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(page.getByRole('alert')).toHaveText(
      'Choose a PNG, JPEG or WebP image.',
    );

    // Put the demo school back as it was.
    await page.getByRole('button', { name: 'Remove logo' }).click();
    await expect(
      page.getByRole('img', { name: 'Greenfield College logo' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Use Dopple’s colour' }).click();
    await page.getByRole('button', { name: 'Same as main colour' }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(schoolColor).toBe('#2f7a55');
    expect(await accentColor()).toBe('#2f7a55');
  });

  test('signs out, and a reload stays signed out', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});

test('sends signed-out visitors to sign in, then back where they were going', async ({
  page,
}) => {
  await page.goto('/classes');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fclasses$/);
  await signIn(page, 'teacher');
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole('link', { name: /JSS 1A/ })).toBeVisible();
});

test('shows the API’s message for a wrong password', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('admin@greenfield.test');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Email or password is incorrect',
  );
});

test('welcomes a new school’s admin with their email filled in', async ({
  page,
}) => {
  await page.goto('/sign-in?email=ada%40example.test&welcome=1');
  await expect(page.getByText('Your school is ready.')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('ada@example.test');
});
