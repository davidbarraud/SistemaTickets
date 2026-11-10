# Spec Delta

## Purpose

Define qué tickets ve cada rol y cómo se presentan: el Solicitante ve solo los propios y el Operador ve todos, con filtro por estado, más el detalle de cada ticket.

## ADDED Requirements

### Requirement: Listado de tickets del Solicitante
Cuando un usuario con rol `SOLICITANTE` consulta el listado de tickets, el sistema SHALL devolver únicamente los tickets que él creó, ordenados del más reciente al más antiguo, con id, título, estado, operador asignado (si hay) y fechas de creación y última actualización.

#### Scenario: Solicitante ve solo sus tickets
- **GIVEN** "ana" creó 2 tickets y "juan" creó 3 tickets
- **WHEN** "ana" consulta el listado
- **THEN** el sistema devuelve solo los 2 tickets de "ana", el más reciente primero

### Requirement: Listado de tickets del Operador
Cuando un usuario con rol `OPERADOR` consulta el listado de tickets, el sistema SHALL devolver todos los tickets, ordenados del más reciente al más antiguo, incluyendo además el nombre y el email del solicitante.

#### Scenario: Operador ve todos los tickets
- **GIVEN** existen 5 tickets de distintos Solicitantes
- **WHEN** un Operador consulta el listado
- **THEN** el sistema devuelve los 5 tickets con los datos de su solicitante

### Requirement: Filtro por estado
Cuando el listado se consulta con un filtro de estado válido (`ABIERTO`, `EN_PROGRESO`, `RESUELTO` o `CERRADO`), el sistema SHALL devolver solo los tickets visibles para ese usuario que estén en ese estado; si el valor del filtro no es un estado válido, SHALL responder 400.

#### Scenario: Operador filtra los abiertos
- **GIVEN** existen 2 tickets `ABIERTO` y 3 `EN_PROGRESO`
- **WHEN** un Operador consulta el listado con el filtro `ABIERTO`
- **THEN** el sistema devuelve solo los 2 tickets `ABIERTO`

#### Scenario: Filtro inválido
- **WHEN** un usuario consulta el listado con el filtro `PENDIENTE`
- **THEN** el sistema responde 400

### Requirement: Detalle de ticket
Cuando un usuario autorizado consulta un ticket, el sistema SHALL devolver todos sus datos: título, descripción, estado, solicitante, operador asignado, nota de resolución y las fechas de creación, inicio, resolución y cierre que correspondan. Son usuarios autorizados el Solicitante dueño y cualquier Operador.

#### Scenario: Operador ve el detalle
- **GIVEN** un ticket `RESUELTO` con nota de resolución
- **WHEN** un Operador consulta su detalle
- **THEN** el sistema devuelve todos los datos del ticket, incluida la nota de resolución

### Requirement: Privacidad de tickets ajenos
Si un usuario con rol `SOLICITANTE` consulta o intenta operar sobre un ticket que no creó, entonces el sistema SHALL responder 404, sin revelar si el ticket existe.

#### Scenario: Solicitante consulta un ticket ajeno
- **GIVEN** un ticket creado por "juan"
- **WHEN** "ana" consulta su detalle
- **THEN** el sistema responde 404

### Requirement: Dashboard según rol en la interfaz
Cuando un usuario inicia sesión en la interfaz, el sistema SHALL mostrarle el dashboard de su rol: al Solicitante, sus tickets y la acción para crear uno nuevo; al Operador, todos los tickets con filtro por estado y las acciones de tomar y resolver. Las acciones no permitidas para el rol o el estado no se muestran. La interfaz SHALL adaptarse a pantallas de celular y de escritorio.

#### Scenario: Solicitante entra a la aplicación
- **GIVEN** un usuario con rol `SOLICITANTE`
- **WHEN** inicia sesión
- **THEN** ve el listado de sus tickets y el botón "Nuevo ticket"
- **AND** no ve el filtro global ni las acciones de Operador

#### Scenario: Operador entra a la aplicación
- **GIVEN** un usuario con rol `OPERADOR`
- **WHEN** inicia sesión
- **THEN** ve todos los tickets con un filtro por estado
- **AND** en los tickets `ABIERTO` ve la acción "Tomar"

#### Scenario: Usuario sin sesión
- **WHEN** una persona sin sesión abre la aplicación
- **THEN** ve solo la pantalla de inicio de sesión con Google
