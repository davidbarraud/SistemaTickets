# Spec Delta

## Purpose

Define cómo se crea un ticket de soporte y cómo avanza por sus estados (`ABIERTO`, `EN_PROGRESO`, `RESUELTO`, `CERRADO`), indicando qué rol puede ejecutar cada transición y qué datos quedan registrados.

## ADDED Requirements

### Requirement: Creación de ticket por Solicitante
Cuando un usuario con rol `SOLICITANTE` envía un título (1 a 150 caracteres, sin contar espacios iniciales y finales) y una descripción (1 a 5000 caracteres), el sistema SHALL crear un ticket en estado `ABIERTO`, con ese usuario como solicitante, sin operador asignado y con fecha de creación, y responder 201 con el ticket creado.

#### Scenario: Creación exitosa
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** envía el título "No funciona la impresora" y una descripción
- **THEN** el sistema responde 201
- **AND** el ticket queda en estado `ABIERTO`, con ese usuario como solicitante y sin operador asignado

### Requirement: Validación de datos del ticket
Si el título o la descripción faltan, quedan vacíos después de quitar espacios o superan su longitud máxima, entonces el sistema SHALL responder 400 indicando los campos inválidos y no crear el ticket.

#### Scenario: Título vacío
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** envía un ticket con título "   " y una descripción válida
- **THEN** el sistema responde 400 indicando el campo título
- **AND** no se crea ningún ticket

#### Scenario: Título demasiado largo
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** envía un título de 151 caracteres
- **THEN** el sistema responde 400

### Requirement: Tomar un ticket
Cuando un usuario con rol `OPERADOR` toma un ticket en estado `ABIERTO`, el sistema SHALL cambiarlo a `EN_PROGRESO`, registrar a ese Operador como asignado y la fecha de inicio.

#### Scenario: Operador toma un ticket abierto
- **GIVEN** un ticket en estado `ABIERTO`
- **WHEN** un Operador lo toma
- **THEN** el ticket pasa a `EN_PROGRESO`
- **AND** el Operador queda registrado como asignado

#### Scenario: Dos Operadores intentan tomar el mismo ticket
- **GIVEN** un ticket en estado `ABIERTO`
- **WHEN** dos Operadores lo intentan tomar al mismo tiempo
- **THEN** solo uno de ellos queda asignado
- **AND** el otro recibe 409

### Requirement: Resolver un ticket con nota
Cuando el Operador asignado resuelve un ticket en estado `EN_PROGRESO` enviando una nota de resolución (1 a 5000 caracteres, sin contar espacios iniciales y finales), el sistema SHALL cambiarlo a `RESUELTO` y guardar la nota y la fecha de resolución.

#### Scenario: Resolución exitosa
- **GIVEN** un ticket en `EN_PROGRESO` asignado al Operador "op1"
- **WHEN** "op1" lo resuelve con la nota "Se reinstaló el driver"
- **THEN** el ticket pasa a `RESUELTO`
- **AND** la nota de resolución queda guardada y visible en el detalle del ticket

#### Scenario: Resolución sin nota
- **GIVEN** un ticket en `EN_PROGRESO` asignado al Operador "op1"
- **WHEN** "op1" intenta resolverlo con una nota vacía
- **THEN** el sistema responde 400
- **AND** el ticket sigue en `EN_PROGRESO`

#### Scenario: Otro Operador intenta resolver
- **GIVEN** un ticket en `EN_PROGRESO` asignado al Operador "op1"
- **WHEN** el Operador "op2" intenta resolverlo
- **THEN** el sistema responde 403
- **AND** el ticket sigue en `EN_PROGRESO`

### Requirement: Cerrar un ticket resuelto
Cuando el Solicitante dueño de un ticket en estado `RESUELTO` confirma la resolución, el sistema SHALL cambiarlo a `CERRADO` y registrar la fecha de cierre. `CERRADO` es un estado final.

#### Scenario: Solicitante confirma la resolución
- **GIVEN** un ticket en `RESUELTO` creado por el Solicitante "ana"
- **WHEN** "ana" confirma la resolución
- **THEN** el ticket pasa a `CERRADO`

#### Scenario: Otro Solicitante intenta cerrar
- **GIVEN** un ticket en `RESUELTO` creado por "ana"
- **WHEN** el Solicitante "juan" intenta cerrarlo
- **THEN** el sistema responde 404
- **AND** el ticket sigue en `RESUELTO`

### Requirement: Rechazo de transiciones inválidas
Si se solicita una transición que no parte del estado de origen permitido (tomar desde `ABIERTO`, resolver desde `EN_PROGRESO`, cerrar desde `RESUELTO`), entonces el sistema SHALL responder 409 indicando el estado actual y no modificar el ticket.

#### Scenario: Cerrar un ticket que no está resuelto
- **GIVEN** un ticket en `EN_PROGRESO` creado por "ana"
- **WHEN** "ana" intenta cerrarlo
- **THEN** el sistema responde 409
- **AND** el ticket sigue en `EN_PROGRESO`

#### Scenario: Tomar un ticket ya cerrado
- **GIVEN** un ticket en `CERRADO`
- **WHEN** un Operador intenta tomarlo
- **THEN** el sistema responde 409

#### Scenario: Ticket inexistente
- **WHEN** un Operador intenta tomar un ticket con un id que no existe
- **THEN** el sistema responde 404
