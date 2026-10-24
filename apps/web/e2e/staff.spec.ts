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

  test('records a student’s guardians, linking a parent already on record', async () => {
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('link', { name: 'Playwright, Ngozika' }).click();
    const guardians = page.getByRole('region', {
      name: 'Parents and guardians',
    });
    await expect(guardians).toContainText('No parent or guardian on record');

    // Emeka Obi is a seeded father of another student.
    await guardians.getByRole('button', { name: 'Add guardian' }).click();
    await guardians.getByLabel('Relationship to Ngozika').fill('Uncle');
    await guardians
      .getByLabel('Already a parent here? Search by name or phone')
      .fill('Emeka');
    await guardians.getByRole('button', { name: 'Link Emeka Obi' }).click();
    await expect(guardians.getByRole('listitem')).toHaveCount(1);
    await expect(guardians).toContainText('Uncle');

    await guardians.getByRole('button', { name: 'Add guardian' }).click();
    await guardians.getByLabel('Relationship to Ngozika').fill('Mother');
    await guardians.getByLabel('Full name').fill('Bisi Playwright');
    await guardians.getByLabel('Phone', { exact: true }).fill('0803 000 1111');
    await guardians
      .getByRole('button', { name: 'Add guardian', exact: true })
      .last()
      .click();
    const bisi = guardians.getByRole('listitem').filter({
      hasText: 'Bisi Playwright',
    });
    await expect(bisi).toContainText('0803 000 1111');
    await expect(bisi).toContainText('No parent account yet');

    await guardians
      .getByRole('button', { name: 'Remove Emeka Obi from Ngozika' })
      .click();
    await expect(guardians.getByRole('listitem')).toHaveCount(1);
  });

  test('fills in the admission record, passport photo and health details', async () => {
    // Still on Ngozika's page from the test above.
    await page.getByRole('button', { name: 'Edit details' }).click();
    await page.getByLabel('Middle name').fill('Adaeze');
    await page.getByLabel('Sex').selectOption('Female');
    await page.getByLabel('Date of birth').fill('2014-03-09');
    await page.getByLabel('State of origin').selectOption('Enugu');
    await page.getByLabel('LGA').fill('Nsukka');
    await page.getByLabel('Previous school').fill('Sunrise Primary School');
    await page.getByRole('button', { name: 'Save changes' }).click();

    const details = page.getByRole('region', { name: 'Details' });
    await expect(details).toContainText('Ngozika Adaeze Playwright');
    await expect(details).toContainText('9 March 2014');
    await expect(details).toContainText('Enugu');
    await expect(details).toContainText('Sunrise Primary School');

    // A 1×1 PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await details.locator('input[type=file]').setInputFiles({
      name: 'passport.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(
      details.getByRole('img', {
        name: 'Passport photo of Ngozika Playwright',
      }),
    ).toBeVisible();
    await expect(details.getByText('Replace photo')).toBeVisible();

    const health = page.getByRole('region', { name: 'Health' });
    await health.getByRole('button', { name: 'Add health details' }).click();
    await health.getByLabel('Genotype').selectOption('AS');
    await health.getByLabel('Allergies').fill('Groundnuts');
    await health.getByRole('button', { name: 'Save health details' }).click();
    await expect(health).toContainText('AS');
    await expect(health).toContainText('Groundnuts');
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
