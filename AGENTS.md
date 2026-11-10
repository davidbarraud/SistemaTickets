# AGENTS.md — Reglas del Proyecto

## Stack Tecnológico

- HTML, CSS, Javascript, Typescript
- Backend: Node.js (Express) en `backend/`.
- Frontend: React + Vite + Tailwind CSS en `frontend/`.
- Base de Datos: MySQL local vía XAMPP (`DB_HOST=localhost`, `DB_NAME=soporte_tickets`).
- Autenticación: Google OAuth 2.0.

## Convenciones de Código y Testing

- La API se testea con Vitest y Supertest.
- La interfaz debe ser moderna, limpia y responsive usando Tailwind CSS.
- Se debe implementar control de acceso por rol: `SOLICITANTE` y `OPERADOR`.

## Principios No Negociables

1. Escribir el test antes de la implementación funcional (TDG).
2. Nunca modificar un test para ocultar un error.
3. No incluir credenciales ni secretos en el repositorio (usar `.env`).
