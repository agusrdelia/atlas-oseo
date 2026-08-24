# Presupuestos de performance

Los presupuestos iniciales sirven como señal de regresión y deben medirse en una máquina y un móvil representativos antes de cambiar los límites.

| Métrica                    | Objetivo inicial                     | Cómo medir                                 |
| -------------------------- | ------------------------------------ | ------------------------------------------ |
| Bundle JavaScript inicial  | ≤ 2.75 MB minificado / ≤ 946 KB gzip | `npm run build` y revisar `dist/assets`    |
| Tiempo hasta interacción   | ≤ 5 s en móvil de referencia         | Performance panel y evento `app_ready`     |
| Render durante exploración | ≥ 30 FPS en móvil                    | DevTools Performance con el modelo cargado |
| Memoria en modo gravedad   | ≤ 300 MB adicionales                 | Task Manager / Memory panel del navegador  |

El build actual muestra aproximadamente 2.75 MB minificados y 946 KB gzip para el chunk principal. Estos valores son el punto de partida del diagnóstico, no una garantía para todos los dispositivos.
