# Tasks

> Regla TDG: en cada grupo, los tests se escriben primero y deben **fallar** (rojo) antes de escribir el código de producción que los hace pasar (verde). Nunca se modifica un test para ocultar un error.

## 1. Andamiaje del backend

- [x] 1.1 Crear `backend/` con TypeScript, Express, Vitest, Supertest, zod, jsonwebtoken, google-auth-library y Prisma; scripts `dev`, `test` y `build`. Verificar que `npm install` termina sin errores y que `npm test` corre (sin tests todavía).
- [x] 1.2 Agregar `.gitignore` (`.env`, `node_modules`, `dist`) y `backend/.env.example` con `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `OPERATOR_EMAILS`, `PORT` y `FRONTEND_ORIGIN` sin valores secretos. Verificar con `git status` que ningún `.env` queda trackeado.
- [x] 1.3 Definir `schema.prisma` con `User`, `Ticket`, `Comment` y los enums `UserRole` y `TicketStatus` (design §5), y crear la migración inicial contra `soporte_tickets` en XAMPP. Verificar que `npx prisma migrate dev` aplica la migración y crea las tres tablas.
- [x] 1.4 Configurar `.env.test` (base `soporte_tickets_test`), un setup global de Vitest que ejecute `prisma migrate deploy` (no destructivo), un helper que vacíe las tablas entre tests solo si `DATABASE_URL` apunta a una base `*_test` y `fileParallelism: false`. Verificar con un test de humo que conecta a la base de test y la encuentra vacía.
- [x] 1.5 Crear `createApp(deps)` separado de `server.ts`, un error handler central con formato `{ error: { code, message, details? } }` y `GET /api/health`. Escribir primero el test Supertest de health y de una ruta inexistente (404 con ese formato), y verificar que pasa.

## 2. Autenticación y roles (`user-auth`)

- [x] 2.1 Escribir tests unitarios de `resolveRole` (mayúsculas, espacios, lista vacía, email ausente) y verificar que fallan; implementar `resolveRole` y verificar que pasan.
- [x] 2.2 Escribir tests Supertest de `POST /api/auth/google` con un `googleVerifier` fake: primer ingreso, ingreso repetido sin duplicar, actualización de nombre/foto, credencial inválida (401), email no verificado (401) y rol según `OPERATOR_EMAILS`, incluido el usuario quitado de la lista. Verificar que fallan.
- [x] 2.3 Implementar la interfaz `googleVerifier` (implementación real con `google-auth-library`), el endpoint de login con upsert de usuario y la emisión del JWT. Verificar que pasan los tests de 2.2.
- [x] 2.4 Escribir tests de los middlewares `authenticate` y `requireRole` y de `GET /api/auth/me`: sin token (401), token vencido o adulterado (401), usuario borrado (401), rol incorrecto (403) y perfil correcto. Implementarlos y verificar que pasan.

## 3. Creación y ciclo de vida de tickets (`ticket-lifecycle`)

- [x] 3.1 Escribir tests unitarios del módulo puro `ticketStateMachine` (transiciones permitidas y prohibidas para tomar, resolver y cerrar) y verificar que fallan; implementarlo y verificar que pasan.
- [x] 3.2 Escribir tests Supertest de `POST /api/tickets`: creación exitosa (201, `ABIERTO`, sin asignado), título vacío o de solo espacios, título de 151 caracteres, descripción ausente (400) y Operador que intenta crear (403). Implementar el endpoint con validación zod y verificar que pasan.
- [x] 3.3 Escribir tests de `POST /api/tickets/:id/take`: éxito (asignado y `startedAt`), ticket inexistente (404), estado inválido (409), Solicitante que intenta tomar (403) y dos tomas concurrentes con `Promise.all` (una 200 y otra 409). Implementar con update condicional (design §6) y verificar que pasan.
- [x] 3.4 Escribir tests de `POST /api/tickets/:id/resolve`: éxito con nota, nota vacía (400), Operador no asignado (403) y estado inválido (409). Implementar y verificar que pasan.
- [x] 3.5 Escribir tests de `POST /api/tickets/:id/close`: éxito por el dueño, Solicitante ajeno (404), ticket no resuelto (409) y Operador que intenta cerrar (403). Implementar y verificar que pasan.

## 4. Listado y detalle de tickets (`ticket-dashboard`, API)

- [x] 4.1 Escribir tests de `GET /api/tickets`: el Solicitante ve solo los suyos, el Operador ve todos con datos del solicitante, orden del más reciente al más antiguo, filtro `?status=` válido y filtro inválido (400). Implementar y verificar que pasan.
- [x] 4.2 Escribir tests de `GET /api/tickets/:id`: detalle completo para el dueño y para un Operador (incluidas nota y fechas) y 404 para un Solicitante ajeno y para un id inexistente. Implementar y verificar que pasan.

## 5. Comentarios (`ticket-comments`)

- [x] 5.1 Escribir tests de `POST /api/tickets/:id/comments`: comentario del dueño y de un Operador (201), texto vacío o de más de 2000 caracteres (400), ticket `CERRADO` (409) y Solicitante ajeno (404). Implementar y verificar que pasan.
- [x] 5.2 Escribir tests de `GET /api/tickets/:id/comments`: orden cronológico con nombre y rol del autor, y 404 para un Solicitante ajeno. Implementar y verificar que pasan.
- [x] 5.3 Documentar en `backend/README.md` la puesta en marcha (bases en XAMPP, `.env`, migraciones) y la tabla de endpoints con sus códigos de error. Verificar que los comandos del README se pueden ejecutar tal como están escritos sobre una base vacía.

## 6. Andamiaje del frontend

- [x] 6.1 Crear `frontend/` con Vite + React + TypeScript + Tailwind + React Router + `@react-oauth/google`, Vitest + Testing Library, el proxy `/api` → `http://localhost:3000` y `frontend/.env.example` con `VITE_GOOGLE_CLIENT_ID`. Verificar que `npm run dev` levanta y `npm test` corre.
- [x] 6.2 Escribir tests del `apiClient` (agrega el header `Bearer`; ante un 401 limpia la sesión) y del `AuthContext` (persiste y restaura la sesión desde `localStorage`). Implementarlos y verificar que pasan.

## 7. Interfaz por rol (`ticket-dashboard`, UI)

- [x] 7.1 Escribir tests de la pantalla de login y de la ruta protegida (sin sesión redirige a `/login`). Implementar la pantalla con el botón de Google que llama a `POST /api/auth/google` y verificar que pasan.
- [x] 7.2 Escribir tests del dashboard del Solicitante (muestra solo lo que devuelve la API, botón "Nuevo ticket", sin filtro global) y del formulario de nuevo ticket (validación de título/descripción y errores 400 de la API). Implementar con Tailwind responsive y verificar que pasan.
- [x] 7.3 Escribir tests del dashboard del Operador (filtro por estado que cambia la query; acción "Tomar" solo en tickets `ABIERTO`). Implementar y verificar que pasan.
- [x] 7.4 Escribir tests del detalle de ticket: acciones según rol y estado ("Resolver" con nota obligatoria solo para el Operador asignado en `EN_PROGRESO`; "Confirmar cierre" solo para el dueño en `RESUELTO`), lista de comentarios renderizada como texto plano y formulario de comentario oculto en `CERRADO`. Implementar y verificar que pasan.

## 8. Verificación integral

- [x] 8.1 Ejecutar `npm test` en `backend/` y `frontend/` y verificar que todas las suites pasan.
- [x] 8.2 Prueba manual con Google real y documentarla en el `README.md` raíz: un Solicitante crea un ticket, un Operador (incluido en `OPERATOR_EMAILS`) lo toma y lo resuelve con nota, ambos comentan y el Solicitante lo cierra. Revisar también la vista en ancho de celular y en escritorio.

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) una vez revisado e implementado, para promover las specs a `openspec/specs/`.
