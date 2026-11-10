# Proposal

## Why

Hoy un ticket solo tiene título y descripción: el Operador no puede distinguir una urgencia de un pedido menor ni saber de qué tipo de problema se trata sin abrir cada uno. Además, la interfaz del MVP es funcional pero austera, y el área pidió un aspecto de panel corporativo más claro y profesional antes de usarla a diario.

## What Changes

- **Prioridad del ticket**: `BAJA`, `MEDIA`, `ALTA` o `URGENTE` (por defecto `MEDIA`). El Solicitante la elige al crear el ticket; después **solo un Operador** puede cambiarla, mientras el ticket no esté `CERRADO`.
- **Categoría del ticket**: `HARDWARE`, `SOFTWARE`, `RED`, `ACCESOS` u `OTRO` (por defecto `OTRO`). El Solicitante la elige al crear el ticket y no se modifica después.
- **Listado**: filtro por prioridad (combinable con el filtro por estado) y orden opcional por prioridad (de `URGENTE` a `BAJA`, y dentro de cada prioridad del más reciente al más antiguo). La API devuelve prioridad y categoría en el listado y el detalle.
- **Formulario de nuevo ticket**: suma los selectores de prioridad y categoría.
- **Rediseño visual del frontend** con Tailwind, estilo panel SaaS: barra de navegación con identidad y menú de usuario, tipografía y espaciado consistentes, tarjetas de resumen por estado en los dashboards, badges de estado y de prioridad con colores distintivos, tabla/lista de tickets más legible, botones con efectos de hover y foco visibles, y diseño responsive (celular y escritorio).
- Los tickets existentes se migran con prioridad `MEDIA` y categoría `OTRO`. No hay cambios incompatibles en la API: los campos nuevos son opcionales al crear.

Fuera de alcance: SLA o vencimientos por prioridad, edición de la categoría, categorías configurables desde la interfaz, modo oscuro y notificaciones.

## Capabilities

### New Capabilities
- `ticket-classification`: prioridad y categoría de un ticket — valores permitidos, valores por defecto, quién las define y quién puede cambiar la prioridad, y cómo se filtran y ordenan los tickets por prioridad.
- `ui-visual-style`: requisitos visuales y de usabilidad de la interfaz — navegación, badges de estado y prioridad, tarjetas de resumen, estados de interacción de los controles y comportamiento responsive.

### Modified Capabilities
- Ninguna. Las capacidades `ticket-lifecycle` y `ticket-dashboard` todavía viven en el cambio `sistema-tickets` (sin archivar), así que este cambio agrega sus requisitos en capacidades nuevas en lugar de modificarlas.

## Impact

- **Base de datos**: nuevos enums `TicketPriority` y `TicketCategory`, columnas `priority` y `category` en `Ticket` con valores por defecto e índice en `priority`; nueva migración de Prisma.
- **API**: `POST /api/tickets` acepta `priority` y `category`; `GET /api/tickets` acepta `priority` y `sort=priority`; nuevo `PATCH /api/tickets/:id/priority` (solo Operador); nuevo `GET /api/tickets/summary` con el conteo por estado para las tarjetas de resumen; las respuestas de ticket incluyen `priority` y `category`.
- **Frontend**: tipos de la API, `NewTicketPage`, `OperatorDashboard`, `RequesterDashboard`, `TicketDetailPage`, `TicketList`, `Layout`, `LoginPage`, `StatusBadge`, nuevo `PriorityBadge` y los estilos compartidos de `components/ui.tsx`.
- **Dependencias**: una fuente web (Inter, vía Google Fonts) como única dependencia nueva; no se agregan librerías de componentes.
- **Orden de archivado**: este cambio se archiva después de `sistema-tickets`.
