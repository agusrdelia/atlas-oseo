# Pruebas del atlas

## Requisitos

- Node.js 20 o superior.
- Dependencias instaladas con `npm ci`.
- Browsers de Playwright instalados con `npx playwright install`.

En CI se instala Chromium junto con sus dependencias del sistema:

```bash
npx playwright install --with-deps chromium
```

## Auditoría rápida de relaciones

```bash
npm run audit:relations
```

Carga el modelo real y comprueba que no existan nombres duplicados ni relaciones cuyo hueso de destino no pueda resolverse.

## Navegación end-to-end

```bash
npm run test:e2e
```

Para ejecutar una prueba individual:

```bash
npx playwright test tests/relations.e2e.spec.ts
npx playwright test tests/analytics.e2e.spec.ts --project=chromium
```

Las pruebas necesitan WebGL y un servidor local. Si el entorno no permite que
Vite escuche en `127.0.0.1:4173`, ejecútalas localmente o en CI. Para depurar
una prueba, agrega `--headed` o `--debug`.

Además de la auditoría, pulsa todos los botones de relaciones anatómicas y verifica que la ficha y el elemento activo cambien al hueso esperado.

El reporte HTML queda en `playwright-report/` y las capturas de fallos en `test-results/`; ambos directorios están ignorados por Git.
