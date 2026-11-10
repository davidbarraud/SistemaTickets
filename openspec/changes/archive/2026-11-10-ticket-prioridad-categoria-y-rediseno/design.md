# Design

## Context

Este cambio parte del código del cambio `sistema-tickets`:

- **Base de datos:** el modelo `Ticket` de Prisma (MySQL 8) tiene el enum `TicketStatus`.
- **API:** las rutas de tickets validan con zod y siguen un orden fijo de verificación: 401 → 403 (rol) → 400 → 404 → 409 → 403 (asignado). Las transiciones usan un `updateMany` condicional para ser atómicas.
- **Frontend:** React 19 con Tailwind 4 (`@tailwindcss/vite`). Hay estilos compartidos mínimos en `components/ui.tsx`, un `StatusBadge` y un `TicketList` que pasa de tarjetas a filas en `md:`.
- **Tests:** 95 del backend (Supertest contra `soporte_tickets_test`) y 47 del frontend (Testing Library con `fetch` mockeado). Todos pasan, y el rediseño no los puede romper ni debilitar.

La motivación está en `proposal.md`; el comportamiento, en `specs/ticket-classification` y `specs/ui-visual-style`.

## Goals / Non-Goals

**Goals:**
- Agregar prioridad y categoría con validación en la API, sin romper a los clientes actuales: los campos nuevos son opcionales al crear.
- Ordenar por prioridad en la base de datos, no en memoria.
- Concentrar el lenguaje visual en unas pocas primitivas reutilizables, para que las páginas no repitan cadenas largas de clases.

**Non-Goals:**
- Paginación del listado.
- Librerías de componentes (Headless UI, shadcn, etc.).
- Modo oscuro.
- Historial de cambios de prioridad.

## Decisions

### 1. Enums de Prisma declarados en orden de severidad

```prisma
enum TicketPriority { BAJA MEDIA ALTA URGENTE }
enum TicketCategory { HARDWARE SOFTWARE RED ACCESOS OTRO }

model Ticket {
  // ...
  priority TicketPriority @default(MEDIA)
  category TicketCategory @default(OTRO)
  @@index([priority])
}
```

MySQL ordena las columnas `ENUM` por el índice de declaración, así que `orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]` devuelve `URGENTE → BAJA` sin lógica extra. Un test de integración lo fija, para detectar el problema si alguien reordena el enum.
*Alternativas:* una columna numérica `priorityLevel`, que duplica la información; u ordenar con `CASE` en SQL crudo, que obliga a salir de Prisma.

### 2. Migración aditiva con valores por defecto

La migración agrega las dos columnas con `DEFAULT 'MEDIA'` y `DEFAULT 'OTRO'`. MySQL completa así las filas existentes, como pide la spec. Se genera con `prisma migrate dev --name ticket_priority_category` y en el resto de los entornos se aplica con `migrate deploy`. Para revertir, una migración que haga `DROP COLUMN` de ambas columnas; no hay pérdida de datos previos al cambio.

### 3. API

```
POST  /api/tickets                 SOLICITANTE { title, description, priority?, category? } -> 201 Ticket
GET   /api/tickets?status=&priority=&sort=priority                                         -> Ticket[]
GET   /api/tickets/summary          conteo por estado de los tickets visibles               -> { ABIERTO, EN_PROGRESO, RESUELTO, CERRADO }
PATCH /api/tickets/:id/priority     OPERADOR { priority }                                   -> Ticket
```

- **Validación:** `priority` y `category` usan `z.nativeEnum(...)` y son opcionales; si faltan, aplica el default de la base. `sort` es `z.enum(['priority'])` opcional, así un valor desconocido da 400.
- **Respuestas:** `toTicketView` agrega `priority` y `category`, de modo que el listado y el detalle los incluyen sin más cambios.
- **Cambio de prioridad:** sigue el orden de verificación existente: 401 → 403 (no es Operador) → 400 (valor) → 404 → 409 (`CERRADO`). Para que no compita con un cierre simultáneo, usa el mismo patrón atómico que las transiciones: `updateMany({ where: { id, status: { not: 'CERRADO' } }, data: { priority } })`. Si actualiza 0 filas, relee el ticket y decide entre 404 y 409. Se eligió `PATCH` sobre el recurso porque no es una transición de estado.
- **`/summary`:** se calcula con `groupBy(['status'])` sobre el mismo `where` de visibilidad del listado (el Solicitante solo cuenta los suyos) y completa con 0 los estados sin tickets. Se declara antes de `/:id` para que no lo capture esa ruta. *Alternativa:* contar en el cliente a partir del listado. Se descartó porque el Operador ve el listado filtrado, y los conteos tienen que ser del total.

### 4. Sistema visual con primitivas propias

- **Tipografía:** Inter desde Google Fonts, con `system-ui` como respaldo, declarada en `@theme` de Tailwind 4 (`--font-sans`). Escala: títulos de página `text-2xl font-semibold tracking-tight`, secciones `text-sm font-semibold`, metadatos `text-xs text-slate-500`.
- **Paleta:**
  - Fondo `slate-50`, superficies blancas con `ring-1 ring-slate-200` y `shadow-sm`.
  - Primario `indigo-600`, con hover `indigo-500` y foco `ring-2 ring-indigo-500 ring-offset-2`.
  - Estados: Abierto en `sky`, En progreso en `amber`, Resuelto en `emerald`, Cerrado en `slate`.
  - Prioridad, de menor a mayor intensidad: Baja `slate`, Media `blue`, Alta `orange`, Urgente `red` sólido con texto blanco.
- **Indicadores que no dependen solo del color:** el badge de estado lleva un punto de color y el texto; el de prioridad lleva un ícono de barras (1 a 4) y el texto.
- **Primitivas en `components/ui.tsx`:**
  - `Button` (variantes `primary`, `secondary`, `ghost` y `danger`, con estados hover, focus-visible y disabled).
  - `Card`, `PageHeader` (título, subtítulo y acciones), `Spinner`, `EmptyState` y `ErrorMessage`.
  - `Field`, `Select` y `TextArea` con un estilo común.
  - Los badges viven en `StatusBadge` y en el nuevo `PriorityBadge`, con una `CategoryLabel` simple.
  Las páginas solo componen estas primitivas.
- **Layout:**
  - Barra superior `sticky` con `top: env(safe-area-inset-top)`: logo y nombre, enlace "Nuevo ticket" (solo Solicitante) y menú de usuario con avatar, nombre, rol y "Cerrar sesión". En celular, nombre y rol se ocultan detrás del avatar.
  - Contenido en `max-w-6xl`.
- **Dashboards:**
  - `PageHeader`, luego una fila de 4 `SummaryCard` (grid de 2 columnas en celular y de 4 en `md:`), luego la barra de filtros y luego `TicketList`.
  - En el panel del Operador, las tarjetas son botones con `aria-pressed` que fijan el filtro de estado. La barra de filtros tiene estado, prioridad y "Ordenar por: Más recientes / Prioridad".
- **`TicketList`:** tabla desde `md:`, con encabezados (`role="columnheader"`) y hover por fila; tarjetas apiladas en celular. Se agregan las columnas de prioridad y categoría. *Ajuste durante la implementación:* no se usa `<table>`, sino una grilla CSS. Cada fila tiene que ser un único link al detalle, para que toda la fila sea clickeable y navegable con teclado (y así lo exigen los tests existentes), y un `<a>` no puede envolver un `<tr>`.
- **Detalle:** dos columnas en `lg:` (contenido y panel lateral de datos). En el panel lateral, el Operador tiene un `Select` de prioridad que hace `PATCH` al cambiar, salvo en `CERRADO`.

*Alternativa:* adoptar una librería de componentes. Se descartó por el peso, por la curva de aprendizaje y porque Tailwind ya cubre lo necesario.

### 5. Tests del rediseño

Se mantiene la regla TDG: primero se escriben los tests nuevos (badges, tarjetas de resumen, filtros y orden, selectores del formulario, control de prioridad).

Los tests existentes buscan por rol y por texto accesible, no por clases, así que el rediseño debe conservar los nombres accesibles. Hay una excepción esperable: el enlace "Nuevo ticket" pasa a aparecer en la barra y también en el estado vacío, y alguna consulta `getByRole` puede volverse ambigua. En ese caso solo se acota la consulta (por ejemplo, `within(nav)`), sin cambiar lo que el test afirma, y se deja asentado en la tarea.

## Risks / Trade-offs

- **[Riesgo] El orden por prioridad depende del orden de declaración del enum** → Mitigación: test de integración del orden y un comentario en `schema.prisma`.
- **[Riesgo] Inter se carga desde Google Fonts: sin red se usa la fuente de respaldo** → Mitigación: `system-ui` como respaldo y `display=swap`. El aspecto general no depende de la fuente.
- **[Riesgo] El rediseño cambia mucho marcado a la vez y puede romper tests existentes** → Mitigación: rediseñar pantalla por pantalla y correr la suite completa después de cada una.
- **[Trade-off] `/summary` es una consulta más por carga del panel** → Es un `GROUP BY` sobre una columna indexada, con costo despreciable en el volumen esperado.
- **[Riesgo] Cambio de prioridad concurrente con un cierre** → Mitigación: el `updateMany` condicional (decisión 3) garantiza que nunca se modifique un ticket `CERRADO`.

## Migration Plan

1. Aplicar la nueva migración a `soporte_tickets` y a `soporte_tickets_test`. El setup de tests ya ejecuta `migrate deploy`.
2. Desplegar juntos el backend y el frontend. Si el backend nuevo corre con el frontend viejo, el frontend ignora los campos extra y sigue creando tickets con los valores por defecto.
3. **Rollback:** volver a la versión anterior del código. Las columnas nuevas, que tienen default, no molestan al código anterior; si hace falta, una migración posterior las elimina.

## Open Questions

- Los textos exactos de los estados vacíos y de los subtítulos de cada panel se pueden ajustar durante la implementación sin afectar las specs.
