# ticket-comments Specification

## Purpose

Permite que el Solicitante dueño de un ticket y los Operadores intercambien mensajes de texto simples dentro del ticket, dejando registro de la conversación.

## Requirements

### Requirement: Publicar un comentario
Cuando un usuario autorizado sobre un ticket no `CERRADO` publica un texto de 1 a 2000 caracteres (sin contar espacios iniciales y finales), el sistema SHALL guardar el comentario con su autor y fecha, y responder 201 con el comentario creado. Son usuarios autorizados el Solicitante dueño del ticket y cualquier Operador.

#### Scenario: Solicitante comenta su ticket
- **GIVEN** un ticket `EN_PROGRESO` creado por "ana"
- **WHEN** "ana" publica el comentario "Sigue fallando después de reiniciar"
- **THEN** el sistema responde 201
- **AND** el comentario queda guardado con "ana" como autora

#### Scenario: Operador comenta un ticket
- **GIVEN** un ticket `ABIERTO`
- **WHEN** un Operador publica un comentario
- **THEN** el sistema responde 201

### Requirement: Validación del comentario
Si el texto del comentario falta, queda vacío después de quitar espacios o supera los 2000 caracteres, entonces el sistema SHALL responder 400 y no guardar el comentario.

#### Scenario: Comentario vacío
- **GIVEN** un ticket `ABIERTO` creado por "ana"
- **WHEN** "ana" publica un comentario con texto "   "
- **THEN** el sistema responde 400

### Requirement: Comentarios bloqueados en tickets cerrados
Mientras un ticket esté en estado `CERRADO`, el sistema SHALL rechazar nuevos comentarios con estado 409.

#### Scenario: Comentar un ticket cerrado
- **GIVEN** un ticket `CERRADO` creado por "ana"
- **WHEN** "ana" intenta publicar un comentario
- **THEN** el sistema responde 409

### Requirement: Restricción de comentarios en tickets ajenos
Si un usuario con rol `SOLICITANTE` intenta publicar o leer comentarios de un ticket que no creó, entonces el sistema SHALL responder 404.

#### Scenario: Solicitante comenta un ticket ajeno
- **GIVEN** un ticket creado por "juan"
- **WHEN** "ana" intenta publicar un comentario en él
- **THEN** el sistema responde 404

### Requirement: Leer comentarios de un ticket
Cuando un usuario autorizado consulta los comentarios de un ticket, el sistema SHALL devolverlos en orden cronológico (el más antiguo primero), con texto, fecha y nombre y rol del autor.

#### Scenario: Listado cronológico
- **GIVEN** un ticket con un comentario de "ana" seguido de otro de un Operador
- **WHEN** "ana" consulta los comentarios del ticket
- **THEN** el sistema devuelve primero el de "ana" y luego el del Operador, cada uno con nombre y rol del autor
