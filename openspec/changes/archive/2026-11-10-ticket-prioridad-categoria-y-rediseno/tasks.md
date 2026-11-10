# Tasks

> Regla TDG: en cada grupo, los tests se escriben primero y deben **fallar** (rojo) antes de escribir el código de producción que los hace pasar (verde). Nunca se modifica un test para ocultar un error.

## 1. Modelo de datos

- [x] 1.1 Agregar a `schema.prisma` los enums `TicketPriority` (`BAJA, MEDIA, ALTA, URGENTE`, con un comentario que advierta que el orden de declaración define el orden por prioridad) y `TicketCategory`, y las columnas `priority @default(MEDIA)` y `category @default(OTRO)` con `@@index([priority])` (design §1). Generar la migración `ticket_priority_category` con un ticket ya cargado en `soporte_tickets` y verificar que queda con `MEDIA`/`OTRO` y el resto de sus datos intactos.

## 2. API de clasificación (`ticket-classification`)

- [x] 2.1 Escribir tests Supertest de `POST /api/tickets` para creación con prioridad y categoría, valores por defecto (`MEDIA`/`OTRO`), prioridad inválida (400 con el campo) y categoría inválida (400 con el campo), y de que listado y detalle incluyen `priority` y `category`. Verificar que fallan; implementar zod opcional y `toTicketView`, y verificar que pasan.
- [x] 2.2 Escribir tests de `GET /api/tickets` con `?priority=` (solo esa prioridad, combinado con `status`, inválido → 400, el Solicitante solo ve los suyos) y `?sort=priority` (`URGENTE → BAJA`, dentro de una misma prioridad el más reciente primero, `sort` desconocido → 400, sin `sort` se mantiene el orden por fecha). Verificar que fallan; implementar y verificar que pasan.
- [x] 2.3 Escribir tests de `PATCH /api/tickets/:id/priority`: Operador asignado y no asignado (200, sin cambiar estado, asignado ni categoría), Solicitante (403 y la prioridad no cambia), valor inválido (400), inexistente (404) y `CERRADO` (409). Verificar que fallan; implementar con `updateMany` condicional (design §3) y verificar que pasan.
- [x] 2.4 Escribir tests de `GET /api/tickets/summary`: conteos por estado con ceros para el Operador (todos) y el Solicitante (solo los suyos), 401 sin sesión, y que la ruta no la capture `/:id`. Verificar que fallan; implementar con `groupBy` y verificar que pasan.
- [x] 2.5 Actualizar la tabla de endpoints y de errores de `backend/README.md` con los parámetros y endpoints nuevos, y verificar que `npm test` del backend pasa completo (los 95 tests anteriores más los nuevos).

## 3. Base visual del frontend (`ui-visual-style`)

- [x] 3.1 Agregar Inter (Google Fonts con `display=swap` en `index.html`) y los tokens en `@theme` de `index.css`. Escribir tests de las primitivas de `components/ui.tsx` (`Button` deshabilitado no dispara `onClick`, `Spinner` con texto accesible, `EmptyState` con su acción), implementarlas (design §4) y verificar que pasan.
- [x] 3.2 Escribir tests de `StatusBadge` (texto de cada estado y estilos distintos entre los cuatro) y del nuevo `PriorityBadge` (texto de cada prioridad, estilos distintos y un indicador no basado solo en color). Verificar que fallan, implementarlos y verificar que pasan.
- [x] 3.3 Escribir tests del `Layout`: enlace "Nuevo ticket" solo para el Solicitante; nombre, rol y "Cerrar sesión" para ambos roles; cerrar sesión lleva a `/login`. Rediseñar la barra de navegación y verificar que pasan, junto con la suite existente del frontend.
- [x] 3.4 Rediseñar `LoginPage` (tarjeta centrada con identidad de la aplicación) sin cambiar su comportamiento, y verificar que los tests existentes de login siguen pasando sin modificar sus aserciones.

## 4. Clasificación y rediseño de pantallas (`ticket-classification` UI + `ui-visual-style`)

- [x] 4.1 Agregar `priority`, `category` y sus listas de valores a `api/types.ts`. Escribir tests de `TicketList`: muestra badges de estado y prioridad y la categoría; columna de solicitante solo con `showRequester`; cada ticket enlaza a su detalle. Rediseñarlo como `<table>` en `md:` y tarjetas en celular, y verificar que pasan.
- [x] 4.2 Escribir tests de `NewTicketPage`: selectores de prioridad (con `Media` preseleccionada) y de categoría, envío con los valores elegidos en el body, botón deshabilitado mientras se envía y errores 400 de la API. Verificar que fallan; implementar el formulario rediseñado y verificar que pasan.
- [x] 4.3 Escribir tests del panel del Solicitante: tarjetas de resumen con los conteos de `/api/tickets/summary`, listado con prioridad y estado vacío con acceso a crear el primer ticket. Verificar que fallan; implementar y verificar que pasan.
- [x] 4.4 Escribir tests del panel del Operador: tarjetas de resumen que fijan el filtro de estado (`aria-pressed`), filtro de prioridad y orden "Prioridad" que cambian la query (`priority=`, `sort=priority`), y "Tomar" solo en tickets `ABIERTO`. Verificar que fallan; implementar y verificar que pasan.
- [x] 4.5 Escribir tests del detalle: muestra prioridad y categoría; el Operador ve el selector de prioridad (no en `CERRADO`) y al cambiarlo se hace `PATCH` y se actualiza el badge; el Solicitante no ve el selector; un error de la API se muestra. Verificar que fallan; implementar el detalle rediseñado (dos columnas en `lg:`) y verificar que pasan.

## 5. Verificación integral

- [x] 5.1 Ejecutar `npm test` y `npm run build` en la raíz y verificar que ambas suites pasan completas y que los dos builds compilan. Dejar asentado cualquier test existente que se haya acotado (solo por ambigüedad de selectores, sin cambiar aserciones).
  - Resultado (2026-11-10): backend 117/117 (95 previos + 22 nuevos), frontend 98/98 (47 previos + 51 nuevos); ambos builds compilan.
  - Ningún test existente se acotó por ambigüedad. **Un** test existente cambió su aserción por un cambio de contrato pedido por la spec (no para ocultar un error): en `RequesterDashboard.test.tsx`, "crea el ticket con los datos sin espacios extra…" ahora espera que el body del POST incluya también `priority: 'MEDIA'` y `category: 'OTRO'` (requisito "Clasificación en la interfaz" de `ticket-classification`).
- [x] 5.2 Prueba manual con Google real: un Solicitante crea un ticket `ALTA`/`HARDWARE`, el Operador lo ve, filtra por prioridad, ordena por prioridad, sube la prioridad a `URGENTE` y lo toma; revisar las tarjetas de resumen, los badges, los estados de hover y foco, y la vista a 375 px y en escritorio. Documentarla en el registro de prueba manual del `README.md` raíz.

## Workflow follow-up

- Archivar primero `sistema-tickets` y después este cambio (`/opsx:archive`), para que las specs se promuevan en orden a `openspec/specs/`.
