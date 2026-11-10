# user-auth Specification

## Purpose

Permite que las personas ingresen al sistema de tickets con su cuenta de Google y les asigna un rol (`SOLICITANTE` u `OPERADOR`) que determina qué pueden ver y hacer en la API y en la interfaz.

## Requirements

### Requirement: Inicio de sesión con Google
Cuando un usuario envía una credencial de Google (ID token) válida, el sistema SHALL verificarla contra el Client ID configurado, registrar al usuario si es la primera vez (email, nombre y foto) y devolver un token de sesión de la API junto con los datos del usuario y su rol.

#### Scenario: Primer ingreso de un usuario
- **GIVEN** un email de Google que no existe en el sistema
- **WHEN** el usuario envía una credencial de Google válida al endpoint de inicio de sesión
- **THEN** el sistema crea el usuario con su email, nombre y foto
- **AND** responde con un token de sesión y los datos del usuario, incluido su rol

#### Scenario: Ingreso de un usuario existente
- **GIVEN** un usuario ya registrado
- **WHEN** envía una credencial de Google válida
- **THEN** el sistema no crea un usuario duplicado
- **AND** actualiza su nombre y foto con los datos recibidos de Google
- **AND** responde con un token de sesión nuevo

### Requirement: Rechazo de credenciales de Google inválidas
Si la credencial de Google es inválida, está vencida, fue emitida para otro Client ID o no tiene el email verificado, entonces el sistema SHALL rechazar el inicio de sesión con estado 401 sin crear ni modificar usuarios.

#### Scenario: Credencial inválida
- **GIVEN** una credencial de Google con firma inválida o vencida
- **WHEN** se envía al endpoint de inicio de sesión
- **THEN** el sistema responde 401
- **AND** no crea ningún usuario

#### Scenario: Email no verificado
- **GIVEN** una credencial válida cuyo email no está verificado por Google
- **WHEN** se envía al endpoint de inicio de sesión
- **THEN** el sistema responde 401

### Requirement: Asignación de rol por OPERATOR_EMAILS
Cuando un usuario inicia sesión, el sistema SHALL asignarle el rol `OPERADOR` si su email figura en la lista `OPERATOR_EMAILS` (separada por comas, sin distinguir mayúsculas ni espacios), y el rol `SOLICITANTE` en cualquier otro caso. El rol se recalcula en cada inicio de sesión.

#### Scenario: Email incluido en OPERATOR_EMAILS
- **GIVEN** `OPERATOR_EMAILS` contiene "soporte@empresa.org"
- **WHEN** inicia sesión el usuario "Soporte@Empresa.org"
- **THEN** el sistema le asigna el rol `OPERADOR`

#### Scenario: Email no incluido
- **GIVEN** `OPERATOR_EMAILS` no contiene "ana@empresa.org"
- **WHEN** inicia sesión "ana@empresa.org"
- **THEN** el sistema le asigna el rol `SOLICITANTE`

#### Scenario: Email removido de la lista
- **GIVEN** un usuario con rol `OPERADOR` cuyo email fue quitado de `OPERATOR_EMAILS`
- **WHEN** vuelve a iniciar sesión
- **THEN** el sistema le asigna el rol `SOLICITANTE`

### Requirement: Protección de endpoints con sesión
Mientras una petición a un endpoint protegido no incluya un token de sesión válido y vigente, el sistema SHALL responder 401 sin ejecutar la operación.

#### Scenario: Petición sin token
- **WHEN** se llama a un endpoint protegido sin token de sesión
- **THEN** el sistema responde 401

#### Scenario: Token vencido o adulterado
- **GIVEN** un token de sesión vencido o con firma inválida
- **WHEN** se llama a un endpoint protegido
- **THEN** el sistema responde 401

### Requirement: Control de acceso por rol
Si un usuario autenticado invoca una operación reservada a otro rol, entonces el sistema SHALL responder 403 sin ejecutar la operación.

#### Scenario: Solicitante intenta una acción de Operador
- **GIVEN** un usuario autenticado con rol `SOLICITANTE`
- **WHEN** intenta tomar un ticket
- **THEN** el sistema responde 403

#### Scenario: Operador intenta crear un ticket
- **GIVEN** un usuario autenticado con rol `OPERADOR`
- **WHEN** intenta crear un ticket
- **THEN** el sistema responde 403

### Requirement: Consulta del usuario actual
Cuando un usuario autenticado consulta su perfil, el sistema SHALL devolver su id, email, nombre, foto y rol.

#### Scenario: Consulta del perfil
- **GIVEN** un usuario autenticado
- **WHEN** consulta el endpoint de usuario actual
- **THEN** el sistema devuelve su id, email, nombre, foto y rol
