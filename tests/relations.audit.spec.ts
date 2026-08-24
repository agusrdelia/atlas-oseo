import { expect, test } from '@playwright/test';

test('todas las relaciones apuntan a huesos existentes', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__ATLAS_DATA_READY__ === true, undefined, {
    timeout: 120_000,
  });

  const audit = await page.evaluate(() => window.__ATLAS_AUDIT__!);
  expect(audit.duplicateNames, `Nombres duplicados: ${audit.duplicateNames.join(', ')}`).toEqual(
    []
  );
  expect(
    audit.unresolved,
    `Relaciones sin destino:\n${audit.unresolved
      .map((relation) => `${relation.sourceName} → ${relation.target}`)
      .join('\n')}`
  ).toEqual([]);
});
