import { test, expect } from '@playwright/test';
import sharp from 'sharp';
test('full user journey, persistence and responsive screens', async ({ page }) => {
  const email = `browser-${Date.now()}@fittrack.invalid`;
  const password = 'BrowserJourney!123';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/register');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/auth-desktop.png', fullPage: true });
  await page.getByLabel('Full name', { exact: true }).fill('Browser Journey');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page.getByText('Welcome to FitTrack AI!')).toBeVisible();
  await page.getByRole('button', { name: 'Start your fitness journey' }).click();
  await page.getByLabel('Age', { exact: true }).fill('30');
  await page.getByLabel('Height (cm)').fill('175');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: /^Build muscle/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s do this' }).click();
  await expect(page.getByRole('heading', { name: 'Make today count.' })).toBeVisible();
  await expect(page.getByText('No activity recorded yet.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Log food', exact: true }).click();
  const foodDialog = page.getByRole('dialog', { name: 'Log your food' });
  await foodDialog.getByLabel('Food name').fill('Paneer rice bowl');
  await foodDialog.getByLabel('Calories (kcal)').fill('450');
  await foodDialog.getByLabel('Protein (g)').fill('25');
  await foodDialog.getByLabel('Carbs (g)').fill('55');
  await foodDialog.getByLabel('Fats (g)').fill('14');
  await foodDialog.getByLabel('Fiber (g)').fill('5');
  await foodDialog.getByLabel('Save to my frequent foods').check();
  await foodDialog.getByRole('button', { name: 'Save food', exact: true }).click();
  await expect(page.getByText('Paneer rice bowl').first()).toBeVisible();
  await page.getByRole('button', { name: 'Edit Paneer rice bowl', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Calories (kcal)').fill('480');
  await page.getByRole('dialog').getByRole('button', { name: 'Save food', exact: true }).click();
  await expect(page.getByText('480', { exact: true }).first()).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
  await nav.getByRole('link', { name: 'Workouts' }).click();
  await page.getByRole('button', { name: 'Edit workout split', exact: true }).click();
  const split = page.getByRole('dialog');
  const today = new Date();
  const dayName = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(today);
  await split.getByRole('button', { name: new RegExp('^' + dayName) }).click();
  const rest = split.getByRole('checkbox', { name: 'Rest & recovery day' });
  if (await rest.isChecked()) await rest.uncheck();
  const chest = split.getByRole('checkbox', { name: 'Chest', exact: true });
  if (!(await chest.isChecked())) await chest.check();
  await split.getByRole('button', { name: 'Save weekly schedule' }).click();
  await page.getByRole('button', { name: /Barbell bench press/ }).click();
  await page.getByLabel('Barbell bench press set 1 weight').fill('40');
  await page.getByLabel('Barbell bench press set 1 reps').fill('12');
  await page.getByLabel('Set 1 completed', { exact: true }).check();
  await page.getByLabel('Barbell bench press set 2 weight').fill('45');
  await page.getByLabel('Barbell bench press set 2 reps').fill('10');
  await page.getByLabel('Set 2 completed', { exact: true }).check();
  await page.getByRole('button', { name: /Save sets/ }).click();
  await expect(page.getByRole('status')).toContainText('Sets saved');
  await page.getByRole('button', { name: 'Mark as completed', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Completed exercises · 1' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Completed exercises · 1' })).toBeVisible();
  await page.getByRole('tab', { name: 'Personal records' }).click();
  await expect(page.getByRole('button', { name: /Barbell bench press/ })).toContainText('45.0');
  await nav.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: '+ 500 ml', exact: true }).click();
  await expect(page.getByText('0.50', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log activity', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Steps walked').fill('5000');
  await page.getByRole('dialog').getByLabel('Walking distance (km)').fill('3.5');
  await page.getByRole('dialog').getByLabel('Active minutes').fill('35');
  await page.getByRole('dialog').getByLabel('Estimated calories burned').fill('210');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByText('5,000', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await nav.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Add photo', exact: true }).click();
  const buffer = await sharp({
    create: { width: 300, height: 240, channels: 3, background: '#68795a' },
  })
    .png()
    .toBuffer();
  await page
    .getByRole('dialog')
    .locator('input[type=file]')
    .setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer });
  await page.getByRole('button', { name: 'Confirm photo', exact: true }).click();
  await expect(page.getByAltText("Browser Journey's profile").first()).toBeVisible();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/profile-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make today count.' })).toBeVisible();
  await expect(page.getByText('5,000', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
  await expect(mobileNav.getByRole('link')).toHaveCount(4);
  await mobileNav.getByRole('link', { name: 'Nutrition' }).click();
  await expect(page.getByText('Paneer rice bowl').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/nutrition-mobile.png', fullPage: true });
  await mobileNav.getByRole('link', { name: 'Workouts' }).click();
  await page.getByRole('button', { name: /Barbell bench press/ }).click();
  await expect(page.getByLabel('Barbell bench press set 2 weight')).toHaveValue('45');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/workout-mobile.png', fullPage: true });
  await mobileNav.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Current password').fill(password);
  await page.getByRole('dialog').getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(errors).toEqual([]);
});
