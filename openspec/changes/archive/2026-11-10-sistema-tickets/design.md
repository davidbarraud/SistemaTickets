# Design

## Context

El repositorio está vacío: solo hay configuración de OpenSpec, `AGENTS.md` y un `package.json` raíz sin dependencias. No hay código previo que respetar, así que este diseño define la estructura inicial. Motivación y alcance en `proposal.md`; el comportamiento exigido está en `specs/` (`user-auth`, `ticket-lifecycle`, `ticket-dashboard`, `ticket-comments`).

Restricciones que condicionan el enfoque:
- MySQL 8 local en XAMPP (`localhost:3306`, base `soporte_tickets`).
- Tests de API con Vitest + Supertest, escritos antes del código de producción.
- Ningún secreto versionado: todo va en `.env`, con un `.env.example` de referencia.
- No se puede obtener un ID token real de Google dentro de un test automatizado.

## Goals / Non-Goals

**Goals:**
- Una API REST cuya lógica de autorización y transiciones de estado se pueda testear entera con Supertest, sin red ni Google.
- Transiciones de estado atómicas: dos Operadores no pueden tomar el mismo ticket.
- Un frontend que solo consume la API y nunca decide permisos por sí mismo (oculta acciones, pero la API es la que hace cumplir las reglas).

**Non-Goals:**
- Despliegue productivo, HTTPS, Docker o CI; el objetivo es correr en local.
- Refresh tokens o revocación de sesiones: al vencer el token se vuelve a iniciar sesión.
- Paginación del listado (volumen esperado bajo en el MVP).

## Decisions

### 1. Estructura del repositorio: dos paquetes independientes con TypeScript

```
/
+-- backend/     Express + Prisma + Vitest/Supertest (TypeScript, ejecutado con tsx)
+-- frontend/    React + Vite + Tailwind + Vitest/Testing Library (TypeScript)
+-- package.json scripts de conveniencia (npm workspaces)
```

TypeScript en ambos lados porque Prisma genera tipos del esquema y Vitest ejecuta TS sin configuración extra. *Alternativa:* JavaScript plano, que es más simple pero pierde los tipos de Prisma y del contrato de la API.

### 2. Flujo de autenticación: ID token de Google → JWT propio

```
 Navegador                     Frontend                  Backend                     Google
    |  click "Ingresar con Google" |                         |                          |
    |----------------------------->| (Google Identity        |                          |
    |                              |  Services popup)        |                          |
    |<---------- ID token ---------|                         |                          |
    |                              |-- POST /api/auth/google {credential} -->           |
    |                              |                         |-- verifyIdToken -------->|
    |                              |                         |<-- email, name, picture -|
    |                              |                         | upsert User + rol        |
    |                              |<-- { token, user } -----|                          |
    |                              | Authorization: Bearer <token> en cada request      |
```

- El frontend usa `@react-oauth/google` para obtener el ID token. El backend lo verifica con `google-auth-library` (`OAuth2Client.verifyIdToken`, audiencia = `GOOGLE_CLIENT_ID`) y exige `email_verified`.
- El backend emite su propio JWT (HS256, `JWT_SECRET`, vencimiento 8 h) con `sub = user.id`. El middleware `authenticate` valida el JWT y **carga el usuario desde la base** en cada request, así el rol usado es siempre el guardado en la tabla.
- *Alternativa descartada:* flujo de authorization code con `passport-google-oauth20` y sesión en el servidor. Requiere manejar redirects, store de sesiones y cookies; es más difícil de testear y no aporta nada para una SPA local.
- *Alternativa descartada:* reenviar el ID token de Google en cada request. Vence en 1 h y ata cada llamada a la verificación de Google.

### 3. Verificador de Google inyectable para poder testear

`createApp({ googleVerifier, prisma, config })` construye la app de Express sin llamar a `listen`. `googleVerifier` es una interfaz `verify(credential) => { email, emailVerified, name, picture }`. En producción usa `google-auth-library`; en los tests se inyecta un fake que traduce credenciales ficticias (por ejemplo `"valid:ana@x.org"`) a perfiles. Así se cubren todos los escenarios de `user-auth` sin red. El ingreso real con Google se valida con una prueba manual.

### 4. Rol: se calcula en el login y se guarda en `User.role`

`resolveRole(email, OPERATOR_EMAILS)` normaliza la lista (split por coma, trim, lowercase) y compara con el email en minúsculas. Se ejecuta en cada `POST /api/auth/google` y se persiste el resultado. Los middlewares `requireRole('OPERADOR')` y `requireRole('SOLICITANTE')` leen `req.user.role`. *Alternativa:* recalcular el rol en cada request desde `.env`, que es más inmediato pero contradice el comportamiento especificado ("se recalcula en cada inicio de sesión") y deja la columna sin sentido.

### 5. Modelo de datos (Prisma / MySQL)

```
 User                         Ticket                               Comment
 ----------------------       ---------------------------------    -------------------
 id          Int PK AI        id             Int PK AI             id        Int PK AI
 email       VarChar UNIQUE   title          VarChar(150)          ticketId  FK Ticket
 name        VarChar          description    Text                  authorId  FK User
 pictureUrl  VarChar?         status         TicketStatus          body      VarChar(2000)
 role        UserRole         requesterId    FK User               createdAt DateTime
 createdAt   DateTime         assigneeId     FK User?
 updatedAt   DateTime         resolutionNote Text?                 @@index(ticketId, createdAt)
                              createdAt / updatedAt
                              startedAt? resolvedAt? closedAt?
                              @@index(status) @@index(requesterId)

 enum UserRole     { SOLICITANTE, OPERADOR }
 enum TicketStatus { ABIERTO, EN_PROGRESO, RESUELTO, CERRADO }

 User 1--* Ticket (requester)   User 1--* Ticket (assignee)   Ticket 1--* Comment   User 1--* Comment
```

Las fechas por transición (`startedAt`, `resolvedAt`, `closedAt`) se guardan como columnas y no en una tabla de historial: alcanza para el MVP, que tiene un flujo lineal. *Alternativa:* una tabla `TicketEvent` de auditoría, que conviene recién si se agregan reaperturas o reasignaciones.

### 6. Transiciones atómicas con update condicional

Cada transición es un único `prisma.ticket.updateMany({ where: { id, status: <origen>, ...condición }, data })`:

| Acción   | Endpoint                         | Rol         | Origen        | Condición extra          | Destino       |
|----------|----------------------------------|-------------|---------------|--------------------------|---------------|
| tomar    | `POST /api/tickets/:id/take`     | OPERADOR    | `ABIERTO`     | -                        | `EN_PROGRESO` |
| resolver | `POST /api/tickets/:id/resolve`  | OPERADOR    | `EN_PROGRESO` | `assigneeId = user.id`   | `RESUELTO`    |
| cerrar   | `POST /api/tickets/:id/close`    | SOLICITANTE | `RESUELTO`    | `requesterId = user.id`  | `CERRADO`     |

Si `count === 0`, se relee el ticket para devolver el error correcto: no existe o no es visible → 404; estado distinto → 409; no es el Operador asignado → 403. Así la carrera entre dos Operadores la resuelve MySQL (una sola fila cumple `status = ABIERTO`) sin transacciones explícitas. *Alternativa:* `SELECT ... FOR UPDATE` dentro de una transacción, más código para el mismo resultado.

La tabla de transiciones vive en un módulo puro (`ticketStateMachine`) con tests unitarios propios.

### 7. API REST y orden de verificación

```
POST /api/auth/google           { credential }            -> { token, user }
GET  /api/auth/me                                         -> user
GET  /api/tickets?status=       (lista según rol)         -> Ticket[]
POST /api/tickets               SOLICITANTE { title, description } -> 201 Ticket
GET  /api/tickets/:id           dueño u OPERADOR          -> Ticket
POST /api/tickets/:id/take      OPERADOR                  -> Ticket
POST /api/tickets/:id/resolve   OPERADOR { resolutionNote } -> Ticket
POST /api/tickets/:id/close     SOLICITANTE (dueño)       -> Ticket
GET  /api/tickets/:id/comments  dueño u OPERADOR          -> Comment[]
POST /api/tickets/:id/comments  dueño u OPERADOR { body } -> 201 Comment
```

Orden fijo de verificación en cada endpoint: **401** (sesión) → **403** (rol) → **400** (body/query, validado con `zod`) → **404** (no existe o es ajeno para un Solicitante) → **409** (estado) → **403** (no es el Operador asignado). Los errores salen de un único error handler con la forma `{ error: { code, message, details? } }`.

### 8. Base de datos de test separada

Los tests de integración usan `soporte_tickets_test` (`DATABASE_URL` en `.env.test`). Antes de la corrida se aplica `prisma migrate deploy`, que solo agrega migraciones pendientes y no borra datos. Entre tests se vacían las tablas en orden (Comment → Ticket → User), y el helper se niega a ejecutarse si `DATABASE_URL` no apunta a una base `*_test`. Se descartó `prisma migrate reset --force`: es destructivo sobre toda la base y Prisma exige consentimiento explícito cada vez que lo invoca un agente de IA, lo que haría imposible correr `npm test` de forma automática. Vitest corre los archivos en serie (`fileParallelism: false`) para que no compartan estado. *Alternativa:* SQLite en memoria, más rápida pero con otro motor y otros enums, lo que oculta errores de MySQL.

### 9. Frontend

- Rutas (React Router): `/login`, `/` (dashboard según rol), `/tickets/nuevo` (solo Solicitante), `/tickets/:id` (detalle + comentarios + acciones).
- `AuthContext` guarda token y usuario en `localStorage`; un `apiClient` basado en `fetch` agrega el header `Bearer` y, ante un 401, cierra la sesión y redirige a `/login`.
- En desarrollo, el proxy de Vite manda `/api` a `http://localhost:3000`, así no hace falta CORS. El backend igual habilita `cors` solo para `FRONTEND_ORIGIN`.
- Tailwind con layout mobile-first: las tarjetas de tickets se apilan en pantallas chicas y pasan a tabla en `md:`; el estado se muestra con un badge de color por estado.
- Tests de componentes con Vitest + Testing Library para el render según rol y las acciones por estado (la API está mockeada).

### 10. Configuración

`.env` por paquete, ignorado por git, con su `.env.example` versionado:
- backend: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `JWT_EXPIRES_IN=8h`, `OPERATOR_EMAILS`, `PORT=3000`, `FRONTEND_ORIGIN`.
- frontend: `VITE_GOOGLE_CLIENT_ID`.

## Risks / Trade-offs

- [El JWT en `localStorage` queda expuesto ante un XSS] → React escapa el contenido por defecto, no se usa `dangerouslySetInnerHTML` (los comentarios se renderizan como texto) y el token vence a las 8 h. Si el sistema sale de la red local, conviene pasar a una cookie `httpOnly`.
- [Un Operador quitado de `OPERATOR_EMAILS` conserva el rol hasta su próximo login] → Es el comportamiento especificado; el impacto se limita con el vencimiento de 8 h. Para revocar al instante se puede borrar al usuario o cambiar `JWT_SECRET`.
- [El login real con Google no está cubierto por tests automáticos] → Todo lo demás se testea con el verificador fake, y se agrega una prueba manual documentada en el README.
- [Prisma Migrate necesita permisos para crear la base de test y la shadow database] → Con el usuario `root` de XAMPP alcanza; se documenta en el README.
- [Sin paginación, el listado del Operador crece sin límite] → Es aceptable para el MVP; el contrato `GET /api/tickets` admite agregar `?page=` después sin romper clientes.

## Migration Plan

Greenfield, no hay datos que migrar. Puesta en marcha local:
1. Crear `soporte_tickets` y `soporte_tickets_test` en el MySQL de XAMPP.
2. Copiar `.env.example` a `.env` en `backend/` y `frontend/` y completar el Client ID de Google y `OPERATOR_EMAILS`.
3. Ejecutar `npx prisma migrate dev` en `backend/`.
4. Ejecutar `npm run dev` en ambos paquetes.

Rollback: `prisma migrate reset` o eliminar la base.

## Open Questions

- Quién crea el OAuth Client ID en Google Cloud Console y con qué cuenta de la organización. No cambia el diseño, solo hace falta tenerlo antes de la prueba manual de login.
