# Proposal

## Why

El área de Sistemas no tiene un canal formal para recibir y seguir los pedidos de soporte técnico: llegan por mensajes sueltos, se pierden y no hay trazabilidad de quién atiende qué ni cuándo se resolvió. Este cambio construye desde cero (greenfield) el MVP de un sistema de tickets que ordena ese flujo entre quienes piden ayuda (Solicitantes) y quienes la brindan (Operadores).

## What Changes

- Inicio de sesión con cuenta de Google (OAuth 2.0). Todo usuario nuevo entra como `SOLICITANTE`; los emails listados en la variable de entorno `OPERATOR_EMAILS` reciben el rol `OPERADOR`.
- Control de acceso por rol en todos los endpoints de la API y en las vistas del frontend.
- Creación de tickets por parte de Solicitantes (título y descripción), que nacen en estado `ABIERTO`.
- Ciclo de vida del ticket con transiciones controladas por rol:
  `ABIERTO` → `EN_PROGRESO` (Operador lo toma) → `RESUELTO` (Operador lo finaliza con nota de resolución) → `CERRADO` (Solicitante confirma).
- Dashboard por rol: el Solicitante ve sus propios tickets; el Operador ve todos los tickets y puede filtrarlos por estado.
- Comentarios simples (texto) en cada ticket, visibles para el Solicitante dueño y los Operadores.
- Estructura de repositorio `backend/` (Express + Prisma + MySQL) y `frontend/` (React + Vite + Tailwind), con tests de API en Vitest + Supertest escritos antes de la implementación.

**Non-goals (fuera del MVP):**
- Archivos adjuntos en tickets o comentarios.
- Notificaciones por correo electrónico.
- Reapertura de tickets, prioridades, categorías, SLA y métricas.
- Gestión de usuarios/roles desde la interfaz (los Operadores se definen solo por `OPERATOR_EMAILS`).

## Capabilities

### New Capabilities
- `user-auth`: Autenticación con Google, emisión y validación de la sesión de la API, y asignación de rol (`SOLICITANTE` / `OPERADOR`) según `OPERATOR_EMAILS`.
- `ticket-lifecycle`: Creación de tickets y máquina de estados (`ABIERTO`, `EN_PROGRESO`, `RESUELTO`, `CERRADO`) con las reglas de quién puede ejecutar cada transición.
- `ticket-dashboard`: Listado y detalle de tickets según el rol (propios para Solicitante, todos con filtro por estado para Operador).
- `ticket-comments`: Publicación y lectura de comentarios de texto en un ticket por parte de los participantes autorizados.

### Modified Capabilities
<!-- Ninguna: no existen specs previas en el proyecto. -->

## Impact

- **Código nuevo**: `backend/` (API REST Express, esquema Prisma, migraciones, tests) y `frontend/` (SPA React con login de Google, dashboards y detalle de ticket).
- **Base de datos**: nueva base `soporte_tickets` en MySQL 8 local (XAMPP) con tablas de usuarios, tickets y comentarios.
- **Dependencias**: `express`, `@prisma/client`/`prisma`, `google-auth-library`, `jsonwebtoken`, `vitest`, `supertest` (backend); `react`, `vite`, `tailwindcss`, `@react-oauth/google` (frontend).
- **Configuración**: variables en `.env` (no versionado) — `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `OPERATOR_EMAILS`, más un `.env.example` sin secretos.
- **Sistemas externos**: proyecto en Google Cloud Console con un OAuth Client ID configurado para el origen local del frontend.
