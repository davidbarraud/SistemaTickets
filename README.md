# Sistema de Tickets de Soporte

Mesa de ayuda para el área de Sistemas. Los **Solicitantes** crean tickets y los **Operadores** los toman, los resuelven con una nota y los comentan. El Solicitante confirma el cierre.

```
ABIERTO --(Operador toma)--> EN_PROGRESO --(Operador resuelve con nota)--> RESUELTO --(Solicitante confirma)--> CERRADO
```

| Carpeta | Contenido |
|---|---|
| `backend/` | API REST con Express, Prisma y MySQL 8. Ver [backend/README.md](backend/README.md). |
| `frontend/` | SPA con React, Vite y Tailwind, con login de Google. |
| `openspec/` | Especificaciones, diseño y tareas (OpenSpec). |

## Puesta en marcha local

1. **MySQL (XAMPP)**: levantar MySQL en `localhost:3306`.
2. **Google OAuth**: en Google Cloud Console, crear un *OAuth Client ID* de tipo "Aplicación web" con `http://localhost:5173` como origen de JavaScript autorizado.
3. **Variables de entorno** (los archivos `.env` no se versionan):
   - `backend/.env`: copiar `backend/.env.example` y completar `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` y `OPERATOR_EMAILS`.
   - `frontend/.env`: copiar `frontend/.env.example` y poner el mismo Client ID en `VITE_GOOGLE_CLIENT_ID`.
4. **Instalar, migrar y levantar**:

   ```bash
   npm run install:all
   npx --prefix backend prisma migrate deploy --schema backend/prisma/schema.prisma
   npm run dev:backend      # http://localhost:3000
   npm run dev:frontend     # http://localhost:5173 (en otra terminal)
   ```

5. **Tests**: `npm test` corre los tests del backend (Vitest + Supertest contra `soporte_tickets_test`) y los del frontend (Vitest + Testing Library).

## Prueba manual end-to-end

Se necesitan dos cuentas de Google: una incluida en `OPERATOR_EMAILS` (Operador) y otra que no lo esté (Solicitante). Conviene usar dos navegadores, o uno en modo incógnito.

1. **Solicitante** ingresa con Google → ve "Mis tickets" vacío → **Nuevo ticket** → completa título y descripción → el ticket aparece como *Abierto*.
2. **Operador** ingresa con Google → ve "Todos los tickets" con el nombre del solicitante → filtra por *Abierto* → **Tomar** → el ticket pasa a *En progreso* y queda asignado a él.
3. Ambos abren el detalle y **comentan**. Cada comentario muestra autor, rol y fecha, y el texto se muestra tal cual, sin interpretar HTML.
4. **Operador**: en el detalle, intenta **Marcar como resuelto** sin nota (se rechaza) → escribe la nota → el ticket pasa a *Resuelto* y la nota es visible.
5. **Solicitante**: ve la nota → **Confirmar cierre** → el ticket pasa a *Cerrado* y el formulario de comentarios desaparece.
6. **Controles de acceso**: el Solicitante no ve el filtro ni el botón "Tomar". Si un Solicitante abre `/tickets/<id>` de un ticket ajeno, ve "Ticket no encontrado".
7. **Responsive**: repetir la navegación en el ancho de un celular (DevTools → 375 px). La lista se ve como tarjetas apiladas y el detalle en una sola columna.

### Registro de la prueba manual

| Fecha | Quién | Resultado | Observaciones |
|---|---|---|---|
| 2026-11-10 | Operador (`OPERATOR_EMAILS`) | Parcial ✅ | Login real con Google OK y rol Operador asignado. Requirió `NODE_EXTRA_CA_CERTS` con la CA de Kaspersky para que el backend valide el token. Pendiente: pasos 1–7 con una segunda cuenta como Solicitante. |
| 2026-11-10 | Solicitante + Operador | ✅ OK | Prueba del cambio `ticket-prioridad-categoria-y-rediseno`: el Solicitante crea un ticket `ALTA`/`HARDWARE`; el Operador lo ve, filtra y ordena por prioridad, sube la prioridad a `URGENTE` y lo toma. Tarjetas de resumen, badges, hover/foco y vistas a 375 px y escritorio revisadas. Sin observaciones. |
| 2026-11-10 | Solicitante + Operador | ✅ OK | Pasos 1–7 de la prueba end-to-end (tarea 8.2 de `sistema-tickets`): resolución con nota (rechazada sin nota), comentarios de ambos roles, confirmación de cierre por el Solicitante y acceso denegado a tickets ajenos ("Ticket no encontrado"). |
