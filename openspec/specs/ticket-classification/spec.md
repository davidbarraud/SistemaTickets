# ticket-classification Specification

## Purpose

Define la prioridad y la categoría de un ticket de soporte: qué valores admiten, quién los establece al crear el ticket, quién puede cambiar la prioridad después y cómo se filtran y ordenan los tickets según su prioridad.

## Requirements

### Requirement: Prioridad y categoría al crear un ticket
Cuando un usuario con rol `SOLICITANTE` crea un ticket indicando una prioridad (`BAJA`, `MEDIA`, `ALTA` o `URGENTE`) y una categoría (`HARDWARE`, `SOFTWARE`, `RED`, `ACCESOS` u `OTRO`), el sistema SHALL guardar el ticket con esos valores y devolverlos en la respuesta 201.

#### Scenario: Creación con prioridad y categoría
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** crea un ticket con prioridad `ALTA` y categoría `HARDWARE`
- **THEN** el sistema responde 201
- **AND** el ticket creado tiene prioridad `ALTA` y categoría `HARDWARE`

### Requirement: Valores por defecto de prioridad y categoría
Cuando un ticket se crea sin indicar prioridad o sin indicar categoría, el sistema SHALL asignar la prioridad `MEDIA` y la categoría `OTRO` respectivamente.

#### Scenario: Creación sin prioridad ni categoría
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** crea un ticket enviando solo título y descripción
- **THEN** el sistema responde 201
- **AND** el ticket tiene prioridad `MEDIA` y categoría `OTRO`

### Requirement: Validación de prioridad y categoría
Si al crear un ticket la prioridad o la categoría tienen un valor fuera de los permitidos, entonces el sistema SHALL responder 400 indicando el campo inválido y no crear el ticket.

#### Scenario: Prioridad inexistente
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** crea un ticket con prioridad `CRITICA`
- **THEN** el sistema responde 400 indicando el campo prioridad
- **AND** no se crea ningún ticket

#### Scenario: Categoría inexistente
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** crea un ticket con categoría `IMPRESORAS`
- **THEN** el sistema responde 400 indicando el campo categoría

### Requirement: Prioridad y categoría visibles
El sistema SHALL incluir la prioridad y la categoría de cada ticket en el listado y en el detalle, para todo usuario que pueda ver ese ticket.

#### Scenario: Detalle con clasificación
- **GIVEN** un ticket con prioridad `URGENTE` y categoría `RED`
- **WHEN** su solicitante consulta el detalle
- **THEN** la respuesta incluye prioridad `URGENTE` y categoría `RED`

### Requirement: Cambio de prioridad por un Operador
Cuando un usuario con rol `OPERADOR` cambia la prioridad de un ticket que no está `CERRADO` a un valor permitido, el sistema SHALL guardar la nueva prioridad sin modificar el estado, el asignado ni la categoría, y responder 200 con el ticket actualizado.

#### Scenario: Operador sube la prioridad
- **GIVEN** un ticket `EN_PROGRESO` con prioridad `MEDIA`
- **WHEN** un Operador cambia su prioridad a `URGENTE`
- **THEN** el sistema responde 200
- **AND** el ticket tiene prioridad `URGENTE` y sigue `EN_PROGRESO` con el mismo asignado

#### Scenario: Operador no asignado también puede cambiarla
- **GIVEN** un ticket `ABIERTO` sin asignado
- **WHEN** un Operador cambia su prioridad a `BAJA`
- **THEN** el sistema responde 200 y el ticket tiene prioridad `BAJA`

### Requirement: Restricciones al cambio de prioridad
Si quien cambia la prioridad no es Operador, el sistema SHALL responder 403; si el valor no es una prioridad permitida, 400; si el ticket no existe, 404; y si el ticket está `CERRADO`, 409. En todos estos casos la prioridad no cambia.

#### Scenario: Solicitante intenta cambiar la prioridad
- **GIVEN** un Solicitante dueño de un ticket `ABIERTO`
- **WHEN** intenta cambiar su prioridad a `URGENTE`
- **THEN** el sistema responde 403
- **AND** la prioridad del ticket no cambia

#### Scenario: Prioridad inválida
- **WHEN** un Operador intenta cambiar la prioridad de un ticket a `ALTISIMA`
- **THEN** el sistema responde 400

#### Scenario: Ticket inexistente
- **WHEN** un Operador intenta cambiar la prioridad del ticket 999999, que no existe
- **THEN** el sistema responde 404

#### Scenario: Ticket cerrado
- **GIVEN** un ticket `CERRADO`
- **WHEN** un Operador intenta cambiar su prioridad
- **THEN** el sistema responde 409

### Requirement: La categoría no se modifica
El sistema SHALL mantener la categoría con la que se creó el ticket; ninguna operación disponible para Solicitantes u Operadores la cambia.

#### Scenario: Cambio de prioridad no altera la categoría
- **GIVEN** un ticket con categoría `SOFTWARE`
- **WHEN** un Operador cambia su prioridad
- **THEN** el ticket conserva la categoría `SOFTWARE`

### Requirement: Filtro por prioridad
Cuando el listado se consulta con un filtro de prioridad válido, el sistema SHALL devolver solo los tickets visibles para ese usuario con esa prioridad, combinable con el filtro por estado; si el valor no es una prioridad permitida, SHALL responder 400.

#### Scenario: Operador filtra urgentes abiertos
- **GIVEN** existen un ticket `ABIERTO` `URGENTE`, uno `ABIERTO` `BAJA` y uno `EN_PROGRESO` `URGENTE`
- **WHEN** un Operador consulta el listado con estado `ABIERTO` y prioridad `URGENTE`
- **THEN** el sistema devuelve solo el ticket `ABIERTO` `URGENTE`

#### Scenario: Filtro de prioridad inválido
- **WHEN** un usuario consulta el listado con prioridad `CRITICA`
- **THEN** el sistema responde 400

#### Scenario: El Solicitante solo filtra entre los suyos
- **GIVEN** un Solicitante con un ticket `ALTA` y otro Solicitante con un ticket `ALTA`
- **WHEN** el primero consulta el listado con prioridad `ALTA`
- **THEN** el sistema devuelve solo su propio ticket

### Requirement: Orden por prioridad
Cuando el listado se consulta con el orden por prioridad, el sistema SHALL devolver los tickets de `URGENTE` a `BAJA` y, dentro de una misma prioridad, del más reciente al más antiguo; sin ese parámetro SHALL mantener el orden del más reciente al más antiguo. Un valor de orden desconocido SHALL responder 400.

#### Scenario: Orden por prioridad
- **GIVEN** existen tickets con prioridades `BAJA`, `URGENTE` y `MEDIA`, creados en ese orden
- **WHEN** un Operador consulta el listado ordenado por prioridad
- **THEN** recibe primero el `URGENTE`, luego el `MEDIA` y por último el `BAJA`

#### Scenario: Misma prioridad
- **GIVEN** dos tickets `ALTA`, uno creado antes que el otro
- **WHEN** un Operador consulta el listado ordenado por prioridad
- **THEN** el más reciente aparece antes

#### Scenario: Orden desconocido
- **WHEN** un usuario consulta el listado con un orden `titulo`
- **THEN** el sistema responde 400

### Requirement: Tickets existentes al incorporar la clasificación
Cuando se incorpora la clasificación, el sistema SHALL asignar a todos los tickets ya existentes la prioridad `MEDIA` y la categoría `OTRO`, sin alterar ningún otro dato.

#### Scenario: Ticket previo a la migración
- **GIVEN** un ticket creado antes de existir la prioridad y la categoría
- **WHEN** se aplica la migración
- **THEN** el ticket tiene prioridad `MEDIA` y categoría `OTRO`
- **AND** conserva su estado, título, descripción y fechas

### Requirement: Clasificación en la interfaz
El formulario de nuevo ticket SHALL ofrecer la prioridad (preseleccionada en `MEDIA`) y la categoría; el listado y el detalle SHALL mostrar ambas; y solo un Operador SHALL ver, en el detalle de un ticket no `CERRADO`, el control para cambiar la prioridad.

#### Scenario: Formulario con valores por defecto
- **GIVEN** un Solicitante en el formulario de nuevo ticket
- **WHEN** abre el formulario
- **THEN** ve los selectores de prioridad (con `Media` seleccionada) y de categoría

#### Scenario: Control de prioridad solo para Operadores
- **GIVEN** un ticket `EN_PROGRESO`
- **WHEN** lo abre un Operador
- **THEN** ve el control para cambiar la prioridad
- **AND** cuando lo abre su Solicitante, ve la prioridad pero no el control

#### Scenario: Operador ordena y filtra en el panel
- **GIVEN** un Operador en su panel
- **WHEN** elige la prioridad `URGENTE` y el orden por prioridad
- **THEN** la interfaz consulta el listado con ese filtro y ese orden y muestra el resultado
