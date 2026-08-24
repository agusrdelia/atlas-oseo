import { expect, test } from '@playwright/test';

test('cada botón de relación navega a la ficha correcta', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toDataURL = () =>
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBgYAAAAAUAAYoz/3gAAAAASUVORK5CYII=';
    Element.prototype.scrollIntoView = () => undefined;
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__ATLAS_READY__ === true, undefined, {
    timeout: 120_000,
  });
  const failures = await page.evaluate(() => {
    const relations = window.__ATLAS_AUDIT__!.relations.filter((relation) => relation.resolvedId);
    return relations.flatMap((relation) => {
      const source = document.querySelector<HTMLButtonElement>(
        `.bone-item[data-id="${relation.sourceId}"]`
      );
      source?.click();
      const link = [...document.querySelectorAll<HTMLButtonElement>('.articulation-link')].find(
        (button) => button.dataset.target === relation.target
      );
      if (!link) return [`${relation.sourceName} → ${relation.target}: botón inexistente`];
      link.click();
      const heading = document.querySelector('.detail h2')?.textContent;
      const active = document
        .querySelector(`.bone-item[data-id="${relation.resolvedId}"]`)
        ?.classList.contains('active');
      if (heading !== relation.resolvedName || !active) {
        return [`${relation.sourceName} → ${relation.target}: no seleccionó el destino`];
      }
      return [];
    });
  });

  expect(failures, failures.join('\n')).toEqual([]);
});
