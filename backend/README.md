# Backend — API de Tickets de Soporte

API REST en Node.js + Express + Prisma sobre MySQL 8 (XAMPP). Autenticación con Google (ID token) y JWT propio.

## Requisitos

- Node.js 20 o superior
- MySQL 8 corriendo en `localhost:3306` (XAMPP), con un usuario que pueda crear bases de datos
- Un OAuth Client ID de Google (tipo "Aplicación web") para iniciar sesión de verdad. Los tests no lo necesitan.

## Puesta en marcha

```bash
cd backend
npm install
cp .env.example .env        # completar DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID y OPERATOR_EMAILS
npx prisma migrate deploy   # crea la base soporte_tickets (si no existe) y aplica las migraciones
npm run dev                 # API en http://localhost:3000
```

Para comprobar que la API está levantada: `GET http://localhost:3000/api/health` debe responder `{"status":"ok"}`.

Para generar un `JWT_SECRET` aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `mysql://USUARIO:CLAVE@localhost:3306/soporte_tickets` |
| `GOOGLE_CLIENT_ID` | Client ID de Google. Se valida como audiencia del ID token. |
| `JWT_SECRET` | Secreto para firmar las sesiones (mínimo 32 caracteres). |
| `JWT_EXPIRES_IN` | Vencimiento de la sesión (por defecto `8h`). |
| `OPERATOR_EMAILS` | Emails con rol `OPERADOR`, separados por coma. Se recalcula en cada login. |
| `PORT` | Puerto de la API (por defecto `3000`). |
| `FRONTEND_ORIGIN` | Origen permitido por CORS (por defecto `http://localhost:5173`). |

## Tests

Los tests de integración usan una base aparte, `soporte_tickets_test`, configurada en `.env.test`. Ese archivo no se versiona: hay que crearlo copiando `.env.example` y cambiando el nombre de la base a `soporte_tickets_test`.

```bash
npm test
```

- Antes de la corrida se ejecuta `prisma migrate deploy` sobre la base de test, que no borra nada.
- Antes de cada test se vacían las tablas. El helper se niega a correr si `DATABASE_URL` no apunta a una base `*_test`.
- El login de Google se prueba con un verificador falso (`tests/helpers/fakeGoogle.ts`), así que los tests no usan la red.

### Antivirus o proxy que inspecciona HTTPS

Si `npm install` o Prisma fallan con `SELF_SIGNED_CERT_IN_CHAIN` (por ejemplo, con Kaspersky Endpoint Security), exportá el certificado raíz del antivirus a un `.pem` y pasáselo a Node, en lugar de desactivar la verificación SSL:

```bash
export NODE_EXTRA_CA_CERTS="/ruta/al/certificado-raiz.pem"
npm config set cafile "/ruta/al/certificado-raiz.pem"
```

## Endpoints

Valores de clasificación: `priority` es `BAJA`, `MEDIA`, `ALTA` o `URGENTE`; `category` es `HARDWARE`, `SOFTWARE`, `RED`, `ACCESOS` u `OTRO`. La categoría no se modifica después de crear el ticket.

Todas las rutas, salvo `/api/health` y `POST /api/auth/google`, requieren el header `Authorization: Bearer <token>`.

| Método y ruta | Rol | Cuerpo / query | Respuesta |
|---|---|---|---|
| `POST /api/auth/google` | público | `{ credential }` (ID token de Google) | `{ token, user }` |
| `GET /api/auth/me` | cualquiera | — | usuario actual |
| `GET /api/tickets` | cualquiera | `?status=ABIERTO\|EN_PROGRESO\|RESUELTO\|CERRADO`, `?priority=BAJA\|MEDIA\|ALTA\|URGENTE`, `?sort=priority` (combinables) | Solicitante: sus tickets. Operador: todos. Del más reciente al más antiguo; con `sort=priority`, de `URGENTE` a `BAJA` y, dentro de cada prioridad, del más reciente al más antiguo. |
| `GET /api/tickets/summary` | cualquiera | — | Conteo por estado de los tickets visibles: `{ ABIERTO, EN_PROGRESO, RESUELTO, CERRADO }` (con ceros). |
| `POST /api/tickets` | SOLICITANTE | `{ title (1-150), description (1-5000), priority?, category? }` | `201` ticket en `ABIERTO`. Por defecto `priority=MEDIA` y `category=OTRO`. |
| `GET /api/tickets/:id` | dueño u OPERADOR | — | ticket |
| `POST /api/tickets/:id/take` | OPERADOR | — | ticket en `EN_PROGRESO`, asignado a quien lo tomó |
| `POST /api/tickets/:id/resolve` | OPERADOR asignado | `{ resolutionNote (1-5000) }` | ticket en `RESUELTO` |
| `POST /api/tickets/:id/close` | SOLICITANTE dueño | — | ticket en `CERRADO` (estado final) |
| `PATCH /api/tickets/:id/priority` | OPERADOR (cualquiera) | `{ priority }` | ticket con la nueva prioridad; no cambia estado, asignado ni categoría. No se permite en `CERRADO`. |
| `GET /api/tickets/:id/comments` | dueño u OPERADOR | — | comentarios en orden cronológico |
| `POST /api/tickets/:id/comments` | dueño u OPERADOR | `{ body (1-2000) }` | `201` comentario |

### Errores

Todos los errores tienen la forma `{ "error": { "code", "message", "details"? } }`. Se verifican en este orden:

| Estado | `code` | Cuándo |
|---|---|---|
| 401 | `UNAUTHORIZED` | Falta el token o es inválido o está vencido; o la credencial de Google es inválida o tiene el email sin verificar. |
| 403 | `FORBIDDEN` | La operación no corresponde al rol del usuario. |
| 400 | `VALIDATION_ERROR` / `INVALID_JSON` | Datos inválidos, incluidos prioridad, categoría, filtro u orden desconocidos. `details` lista los campos con error. |
| 404 | `NOT_FOUND` | El ticket no existe o, para un Solicitante, no es suyo. No se distingue entre ambos casos. |
| 409 | `CONFLICT` | La transición no parte del estado permitido, o se intenta comentar un ticket cerrado o cambiar la prioridad de un ticket cerrado. `details.currentStatus` indica el estado actual. |
| 403 | `FORBIDDEN` | Un Operador intenta resolver un ticket que tomó otro Operador. |
