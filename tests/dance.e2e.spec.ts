import { expect, test } from '@playwright/test';

type ViewSnapshot = {
  cameraPosition: number[];
  target: number[];
};

function expectSameView(actual: ViewSnapshot, expected: ViewSnapshot) {
  const distance = (left: number[], right: number[]) =>
    Math.hypot(...left.map((value, index) => value - right[index]!));
  expect(
    distance(actual.cameraPosition, expected.cameraPosition),
    `La cámara cambió de ${expected.cameraPosition.join(',')} a ${actual.cameraPosition.join(',')}`
  ).toBeLessThan(0.03);
  expect(
    distance(actual.target, expected.target),
    `El target cambió de ${expected.target.join(',')} a ${actual.target.join(',')}`
  ).toBeLessThan(0.03);
}

function viewDistance(view: ViewSnapshot) {
  return Math.hypot(...view.cameraPosition.map((value, index) => value - view.target[index]!));
}

function viewDirection(view: ViewSnapshot) {
  const distance = viewDistance(view);
  return view.cameraPosition.map((value, index) => (value - view.target[index]!) / distance);
}

test('el modo baile puede activarse y detenerse', async ({ page }) => {
  const gravityRequests: string[] = [];
  page.on('request', (request) => {
    if (/gravity-controller|rapier/i.test(request.url())) gravityRequests.push(request.url());
  });
  await page.addInitScript(() => {
    let thumbnailRenderCount = 0;
    const testWindow = window as unknown as {
      __THUMBNAIL_RENDER_COUNT__: number;
      __RENDER_COUNT_AT_READY__?: number;
    };
    HTMLCanvasElement.prototype.toDataURL = () => {
      thumbnailRenderCount += 1;
      testWindow.__THUMBNAIL_RENDER_COUNT__ = thumbnailRenderCount;
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBgYAAAAAUAAYoz/3gAAAAASUVORK5CYII=';
    };
    document.addEventListener('DOMContentLoaded', () => {
      const bootLoader = document.querySelector('#boot-loader');
      if (!bootLoader) return;
      new MutationObserver(() => {
        if (bootLoader.classList.contains('done')) {
          testWindow.__RENDER_COUNT_AT_READY__ = thumbnailRenderCount;
        }
      }).observe(bootLoader, { attributeFilter: ['class'] });
    });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ATLAS_READY__ === true, undefined, {
    timeout: 120_000,
  });

  const button = page.locator('.dance-btn');
  await expect(button).toBeEnabled();
  const defaultView = await page.evaluate(() => window.__ATLAS_VIEW__!());
  const renderCountAtReady = await page.evaluate(
    () =>
      (window as unknown as { __RENDER_COUNT_AT_READY__?: number }).__RENDER_COUNT_AT_READY__ ?? 0
  );
  expect(renderCountAtReady).toBeGreaterThan(0);
  expect(renderCountAtReady).toBeLessThanOrEqual(21);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(button).toHaveClass(/active/);
  expect(gravityRequests).toEqual([]);

  await page.locator('.region-title').first().click();
  await page.locator('.bone-item').first().click();
  await expect(page.locator('.detail')).toHaveClass(/open/);
  await page.waitForTimeout(500);
  const closeStartView = await page.locator('.detail .close').evaluate((closeButton) => {
    const view = window.__ATLAS_VIEW__!();
    (closeButton as HTMLButtonElement).click();
    return view;
  });
  await expect(page.locator('.detail')).not.toHaveClass(/open/);
  await page.waitForFunction(
    (defaultDistance) => {
      const view = window.__ATLAS_VIEW__!();
      const distance = Math.hypot(
        ...view.cameraPosition.map((value, index) => value - view.target[index]!)
      );
      return Math.abs(distance - defaultDistance) < 0.03;
    },
    viewDistance(defaultView),
    { timeout: 10_000 }
  );
  const closedView = await page.evaluate(() => window.__ATLAS_VIEW__!());
  expect(
    viewDistance(closedView),
    `El zoom quedó en ${viewDistance(closedView)} y debía volver a ${viewDistance(defaultView)}`
  ).toBeCloseTo(viewDistance(defaultView), 1);
  const closedDirection = viewDirection(closedView);
  const initialDirection = viewDirection(closeStartView);
  expect(
    Math.hypot(...closedDirection.map((value, index) => value - initialDirection[index]!))
  ).toBeLessThan(0.03);

  await page.waitForTimeout(500);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
});

test('el modo trotar se activa y reemplaza al baile', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toDataURL = () =>
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBgYAAAAAUAAYoz/3gAAAAASUVORK5CYII=';
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ATLAS_READY__ === true, undefined, {
    timeout: 120_000,
  });

  const dance = page.locator('.dance-btn');
  const jog = page.locator('.jog-btn');
  const canvas = page.locator('#scene');
  await expect(jog).toBeEnabled();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Canvas no disponible');
  await page.keyboard.down('Control');
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await page.waitForTimeout(800);
  const danceStartView = await dance.evaluate((button) => {
    const view = window.__ATLAS_VIEW__!();
    (button as HTMLButtonElement).click();
    return view;
  });
  await expect(dance).toHaveAttribute('aria-pressed', 'true');
  const danceView = await page.evaluate(() => window.__ATLAS_VIEW__!());
  expectSameView(danceView, danceStartView);
  const jogStartView = await jog.evaluate((button) => {
    const view = window.__ATLAS_VIEW__!();
    (button as HTMLButtonElement).click();
    return view;
  });
  await expect(jog).toHaveAttribute('aria-pressed', 'true');
  await expect(jog).toHaveClass(/active/);
  await expect(dance).toHaveAttribute('aria-pressed', 'false');
  const jogView = await page.evaluate(() => window.__ATLAS_VIEW__!());
  expectSameView(jogView, jogStartView);
  await jog.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(jog).toHaveAttribute('aria-pressed', 'false');
});
