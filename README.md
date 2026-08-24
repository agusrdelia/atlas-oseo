# Skeletal 3D

Atlas óseo interactivo para explorar el esqueleto humano en 3D, consultar fichas anatómicas y seguir relaciones entre huesos.

Demo: [skeletal-3d.vercel.app](https://skeletal-3d.vercel.app/)

## Requisitos

- Node.js 20 o superior
- npm
- Un navegador con WebGL

## Instalación y comandos

```bash
npm ci
npm run dev
```

Otros comandos disponibles:

```bash
npm run build        # typecheck y build de producción
npm run format:check # verifica el formato
npm run test:e2e     # pruebas end-to-end con Playwright
npm run audit:relations
```

## Estructura

- `src/domain`: datos y reglas anatómicas.
- `src/data`: datos auxiliares del atlas.
- `src/three`: escena, carga del modelo y controladores 3D.
- `src/ui`: plantillas, componentes y estilos de interfaz.
- `src/analytics`: eventos opcionales de Google Analytics.
- `public/models`: modelo 3D distribuido con la aplicación.

## Modelo 3D

El modelo utilizado es una adaptación de [Open3DModel — Skeleton — English labels](https://anatomytool.org/content/open3dmodel-skeleton-english-labels). Para reemplazarlo, coloca un GLB compatible en `public/models/overview-skeleton.glb` y conserva los nombres de huesos esperados por `src/domain/anatomy.ts`. Revisa también las obligaciones de atribución y compartir igual descritas en [docs/ASSETS.md](docs/ASSETS.md).

## Tests

Las pruebas end-to-end usan Playwright. Consulta [TESTING.md](TESTING.md) para la auditoría de relaciones y las notas de ejecución.

## Créditos y licencias

El código de esta aplicación está bajo la licencia MIT. Los modelos, audios, imágenes y decoders tienen licencias independientes; el inventario y sus fuentes están en [docs/ASSETS.md](docs/ASSETS.md).

## Aviso de uso

Skeletal 3D es un proyecto educativo y de portfolio. No es material médico certificado ni debe utilizarse como referencia clínica o para diagnóstico.

## Analytics y privacidad

Google Analytics es opcional y se activa solo cuando se configura `VITE_GA_MEASUREMENT_ID`. Consulta [docs/analytics.md](docs/analytics.md) antes de publicar una instancia con medición habilitada y adapta el consentimiento a la normativa aplicable.
