import { expect, test, type Page } from '@playwright/test';

type CapturedEvent = {
  name: string;
  parameters: Record<string, unknown>;
};

async function analyticsEvents(page: Page) {
  return page.evaluate(() => {
    const dataLayer = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer;
    return (dataLayer ?? [])
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === 'event')
      .map(
        (entry) =>
          ({
            name: entry[1],
            parameters: entry[2] ?? {},
          }) as CapturedEvent
      );
  });
}

test.describe.configure({ timeout: 300_000 });

test('registra eventos útiles sin datos sensibles ni duplicados @slow', async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toDataURL = () =>
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBgYAAAAAUAAYoz/3gAAAAASUVORK5CYII=';
    Element.prototype.scrollIntoView = () => undefined;
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ATLAS_READY__ === true, undefined, {
    timeout: 120_000,
  });

  await page.locator('.region-title').first().click();
  const firstBone = page.locator('.bone-item').first();
  await firstBone.click();
  await firstBone.click();

  const dance = page.locator('.dance-btn');
  await dance.click();
  await page.waitForTimeout(30);
  await dance.click();

  await page.locator('#scene').evaluate((canvas) => {
    canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
    canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
    canvas.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 50, clientY: 50 }));
    canvas.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 50, clientY: 50 }));
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        ctrlKey: true,
        clientX: 10,
        clientY: 10,
      })
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 1,
        ctrlKey: true,
        clientX: 50,
        clientY: 10,
      })
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        ctrlKey: true,
        clientX: 50,
        clientY: 10,
      })
    );
  });

  const search = page.locator('#search');
  await search.fill('frontal');
  await page.waitForTimeout(700);
  await page.locator('.bone-item').first().click();
  const relation = page.locator('.articulation-link').first();
  await expect(relation).toBeVisible();
  await relation.click();

  await search.fill('');
  await page.evaluate(() => {
    [...document.querySelectorAll<HTMLButtonElement>('.bone-item')]
      .slice(0, 25)
      .forEach((button) => button.click());
  });

  await page.locator('.icon-btn').click();
  await page.locator('.donation-link').evaluate((link) => {
    link.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    (link as HTMLAnchorElement).click();
  });
  await page.locator('.info-close').click();

  const gravity = page.locator('.gravity-btn');
  await gravity.click();
  await expect(gravity).toHaveAttribute('aria-pressed', 'true', { timeout: 120_000 });
  const fallenView = await page.evaluate(() => window.__ATLAS_VIEW__!());
  await dance.click();
  await expect(gravity).toHaveAttribute('aria-pressed', 'false');
  await expect(dance).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
  const recoveredView = await page.evaluate(() => window.__ATLAS_VIEW__!());
  expect(recoveredView.cameraPosition).toEqual(fallenView.cameraPosition);
  expect(recoveredView.target).toEqual(fallenView.target);

  const events = await analyticsEvents(page);
  expect(events.some((event) => event.name === 'app_ready')).toBe(true);

  const boneViews = events.filter((event) => event.name === 'bone_view');
  expect(boneViews.some((event) => event.parameters.source === 'list')).toBe(true);
  expect(boneViews.some((event) => event.parameters.source === 'search')).toBe(true);
  expect(boneViews.some((event) => event.parameters.source === 'relation')).toBe(true);
  expect(boneViews.some((event) => event.parameters.is_first_view === false)).toBe(true);

  const searchEvent = events.find((event) => event.name === 'search_used');
  expect(searchEvent?.parameters).toMatchObject({
    query_length: 7,
    has_results: true,
  });
  expect(searchEvent?.parameters).not.toHaveProperty('query');
  expect(searchEvent?.parameters).not.toHaveProperty('search_term');

  expect(events.filter((event) => event.name === 'relation_follow')).toHaveLength(1);
  expect(
    events.filter(
      (event) => event.name === 'exploration_milestone' && event.parameters.percent === 10
    )
  ).toHaveLength(1);
  expect(
    events.filter((event) => event.name === 'control_used' && event.parameters.control === 'zoom')
  ).toHaveLength(1);
  expect(
    events.filter(
      (event) => event.name === 'control_used' && event.parameters.control === 'double_zoom'
    )
  ).toHaveLength(1);
  expect(
    events.filter((event) => event.name === 'control_used' && event.parameters.control === 'rotate')
  ).toHaveLength(1);

  const motionEvents = events.filter((event) => event.name === 'motion_mode');
  expect(motionEvents.map((event) => [event.parameters.mode, event.parameters.action])).toEqual([
    ['dance', 'start'],
    ['dance', 'stop'],
    ['gravity', 'start'],
    ['gravity', 'stop'],
    ['dance', 'start'],
  ]);
  expect(motionEvents[1].parameters.duration_ms).toEqual(expect.any(Number));
  expect(events.filter((event) => event.name === 'info_open')).toHaveLength(1);
  expect(events.filter((event) => event.name === 'donation_click')).toHaveLength(1);

  await page.evaluate(() => {
    (window as unknown as { gtag?: unknown }).gtag = undefined;
  });
  await page.locator('.icon-btn').click();
  await expect(page.locator('.info-modal')).toHaveClass(/open/);
});
