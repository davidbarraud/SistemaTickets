# Spec Delta

## Purpose

Define el aspecto y el comportamiento visual de la interfaz de la mesa de ayuda (estilo panel corporativo): navegación, indicadores de estado y prioridad, tarjetas de resumen, estados de interacción de los controles y adaptación a celular y escritorio.

## ADDED Requirements

### Requirement: Barra de navegación
Mientras hay una sesión iniciada, la interfaz SHALL mostrar una barra de navegación fija en la parte superior con el nombre de la aplicación (que lleva al panel), un acceso a "Nuevo ticket" solo para el Solicitante y un menú de usuario con su nombre, su rol y la opción "Cerrar sesión".

#### Scenario: Navegación del Solicitante
- **GIVEN** un Solicitante con sesión iniciada
- **WHEN** ve cualquier pantalla de la aplicación
- **THEN** la barra muestra el nombre de la aplicación, el acceso "Nuevo ticket" y su nombre con el rol "Solicitante"

#### Scenario: Navegación del Operador
- **GIVEN** un Operador con sesión iniciada
- **WHEN** ve cualquier pantalla de la aplicación
- **THEN** la barra no muestra el acceso "Nuevo ticket"
- **AND** muestra su nombre con el rol "Operador" y la opción "Cerrar sesión"

### Requirement: Badges de estado
La interfaz SHALL mostrar el estado de cada ticket como una etiqueta con texto legible (Abierto, En progreso, Resuelto, Cerrado), un color distinto por estado y un indicador visual adicional al color, de modo que el estado se distinga sin depender solo del color.

#### Scenario: Cada estado tiene su etiqueta
- **GIVEN** un listado con un ticket en cada uno de los cuatro estados
- **WHEN** el usuario lo ve
- **THEN** cada ticket muestra la etiqueta con el texto de su estado
- **AND** las cuatro etiquetas usan estilos distintos entre sí

### Requirement: Badges de prioridad
La interfaz SHALL mostrar la prioridad de cada ticket como una etiqueta con texto (Baja, Media, Alta, Urgente) y una intensidad de color creciente según la prioridad, con `Urgente` destacada por sobre las demás.

#### Scenario: Ticket urgente destacado
- **GIVEN** un ticket con prioridad `URGENTE` y otro con prioridad `BAJA`
- **WHEN** el usuario ve el listado
- **THEN** ambos muestran su etiqueta de prioridad con texto
- **AND** las dos etiquetas usan estilos distintos

### Requirement: Tarjetas de resumen por estado
El panel de cada rol SHALL mostrar, sobre el listado, una tarjeta por estado con la cantidad de tickets visibles para ese usuario en ese estado; en el panel del Operador, elegir una tarjeta SHALL aplicar el filtro por ese estado.

#### Scenario: Conteos del Solicitante
- **GIVEN** un Solicitante con 2 tickets `ABIERTO` y 1 `RESUELTO`
- **WHEN** abre su panel
- **THEN** ve las tarjetas con 2 en Abierto, 0 en En progreso, 1 en Resuelto y 0 en Cerrado

#### Scenario: Operador filtra desde una tarjeta
- **GIVEN** un Operador en su panel
- **WHEN** elige la tarjeta "En progreso"
- **THEN** el listado queda filtrado por el estado `EN_PROGRESO`

### Requirement: Listado de tickets legible
En pantallas de escritorio la interfaz SHALL mostrar los tickets como una tabla con encabezados (ticket, estado, prioridad, categoría, solicitante para el Operador, asignado y fecha), y en pantallas angostas como tarjetas apiladas con la misma información; cada ticket SHALL llevar a su detalle.

#### Scenario: Ticket enlazado al detalle
- **GIVEN** un listado con el ticket #7
- **WHEN** el usuario elige el ticket #7
- **THEN** la interfaz muestra el detalle del ticket #7

### Requirement: Estados de interacción de los controles
Los botones y enlaces de acción SHALL tener un estilo visible al pasar el puntero y al recibir el foco del teclado, y un estilo deshabilitado mientras una acción está en curso, durante el cual no se pueden volver a activar.

#### Scenario: Botón deshabilitado durante el envío
- **GIVEN** un Solicitante que envía el formulario de nuevo ticket
- **WHEN** la creación todavía está en curso
- **THEN** el botón de envío está deshabilitado

### Requirement: Diseño responsive
La interfaz SHALL poder usarse desde 360 px de ancho sin desplazamiento horizontal de la página, con el detalle del ticket en una columna en pantallas angostas y en dos columnas (contenido y datos del ticket) en escritorio.

#### Scenario: Uso desde el celular
- **GIVEN** una pantalla de 375 px de ancho
- **WHEN** el usuario navega el panel, el formulario y el detalle
- **THEN** todo el contenido se ve sin desplazamiento horizontal de la página

### Requirement: Estados vacíos y de carga
Mientras se cargan datos, la interfaz SHALL mostrar un indicador de carga; y cuando un listado no tiene tickets, SHALL mostrar un mensaje explicativo y, para el Solicitante, una invitación a crear su primer ticket.

#### Scenario: Solicitante sin tickets
- **GIVEN** un Solicitante sin tickets
- **WHEN** abre su panel
- **THEN** ve un mensaje que indica que todavía no tiene tickets y un acceso para crear uno
