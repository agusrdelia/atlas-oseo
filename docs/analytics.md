# Analytics de Atlas Óseo

La aplicación carga GA4 únicamente cuando existe `VITE_GA_MEASUREMENT_ID`. Si la variable está
vacía, Analytics queda desactivado y el atlas continúa funcionando sin enviar eventos.

Copia `.env.example` a `.env.local` y configura el identificador antes de publicar una instancia
con medición. No uses el archivo `.env.local` para guardar secretos: un ID de medición es público.

## Dimensiones personalizadas en GA4

Crear estas dimensiones con alcance **Evento** desde **Administrar → Definiciones
personalizadas → Crear dimensión personalizada**:

| Nombre visible      | Parámetro del evento |
| ------------------- | -------------------- |
| Nombre del hueso    | `bone_name`          |
| Región anatómica    | `region`             |
| Origen de selección | `source`             |
| Modo interactivo    | `mode`               |
| Acción del modo     | `action`             |
| Control 3D          | `control`            |
| Tipo de dispositivo | `device_type`        |

## Eventos

- `bone_view`: apertura de una ficha desde modelo, listado, búsqueda o relación.
- `exploration_milestone`: progreso del 10%, 25%, 50%, 75% o 100% durante la sesión.
- `relation_follow`: navegación entre huesos relacionados.
- `motion_mode`: inicio y detención de baile, trote o gravedad; al detener incluye duración.
- `control_used`: primer uso por sesión de zoom, movimiento, rotación o doble zoom.
- `search_used`: longitud de consulta y cantidad de resultados, nunca el texto ingresado.
- `info_open`: apertura del panel de información.
- `donation_click`: click en el enlace de donaciones.
- `app_ready`: tiempo hasta que el modelo queda interactivo.

Los eventos se pueden verificar en **Administrar → DebugView** antes de crear informes o
exploraciones.
