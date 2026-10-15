# SARLAFT · Sistema interno

Sistema interno de la **E.S.E. Hospital San José del Guaviare** para gestionar los formatos del
Sistema de Administración del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SARLAFT).

> Última actualización: 15/10/2026

## Qué incluye

| Módulo | Formato | Ruta | Prefijo | Tabla | Quién lo usa |
|---|---|---|---|---|---|
| Transacciones en efectivo | **E-PL-FO-15** Transacción individual en efectivo | `/transacciones` | `TE-` | `transacciones_efectivo` | Admin y Gestor |
| Ausencias | **E-PL-FO-13** Ausencia de transacciones en efectivo | `/ausencias` | `AT-` | `ausencia_transacciones` | Admin y Gestor |
| Reportes ROS | **E-PL-FO-14** Operación intentada, inusual o sospechosa | `/reportes-ros` | `ROS-` | `reporte_ros` | Gestor **envía**; solo Admin consulta |
| Transacciones múltiples | **E-PL-FO-16** Transacciones múltiples | `/transacciones-multiples` | `TM-` | `transacciones_multiples` + `_detalle` | Admin y Gestor |
| Vinculación de terceros | **E-PL-FO-09** Vinculación y actualización de terceros | `/vinculacion-terceros` | `VT-` | `vinculacion_terceros` | Admin y Gestor |
| Declarantes | Personas que pagan, reportan o responden | `/declarantes` | — | `declarantes` | Admin y Gestor |
| Dependencias | Áreas del hospital | `/dependencias` | — | `dependencias` | Admin (edita) |
| Usuarios | Acceso al sistema | `/usuarios` | — | `usuarios` | Solo Admin |
| Historial de auditoría | Quién hizo qué y cuándo (solo lectura) | `/historial` | — | `historial` | Solo Admin |
| Mi perfil | Datos de la cuenta, cambio de contraseña y actividad propia | `/profile` | — | `usuarios` + `historial` | Cada usuario, solo la suya |
| Dashboard | Indicadores y actividad reciente | `/dashboard` | — | vista `dashboard` | Admin y Gestor |

Funciones que atraviesan todos los formatos:

| Función | Qué hace |
|---|---|
| **PDF** | Los formatos **aprobados** se pueden descargar como PDF con el encabezado oficial (ver «PDF de los formatos aprobados»). |
| **Notificaciones** | La campana del encabezado avisa al administrador de lo pendiente y al gestor de lo que ya fue revisado. |
| **Menú de configuración** | La rueda del encabezado da acceso a «Mi perfil y contraseña» y, para el administrador, a Usuarios, Dependencias e Historial. |

Los formatos oficiales están publicados en <https://esehospitalguaviare.gov.co/sarlaft/58>.
Los usuarios externos reportan desde esa página web; este sistema es para el personal interno y comparte la misma base de datos.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | Angular 22 (componentes standalone, señales, sin zone.js), Tailwind CSS v4, TypeScript |
| Backend | API REST en PHP 8.1+ (PDO, sin frameworks), autenticación JWT HS256 propia |
| Base de datos | MySQL / MariaDB (InnoDB, utf8mb4), base `sistemasarlaft` |
| Desarrollo local | XAMPP (Apache + MariaDB), Angular en `http://localhost:4200` |
| PDF | Se genera en el navegador con la opción «Guardar como PDF» de la impresión (no requiere librerías en el hosting) |

## Roles y permisos

| Acción | Administrador | Gestor |
|---|:-:|:-:|
| Ver listas y detalles de transacciones, ausencias, múltiples y vinculaciones | ✅ | ✅ |
| Crear formularios | ✅ | ✅ |
| Editar formularios **pendientes** | ✅ | ✅ |
| Editar formularios aprobados o rechazados | ✅ | ❌ |
| Aprobar, rechazar o volver a pendiente | ✅ | ❌ |
| Eliminar | ✅ | ❌ |
| **Enviar** un ROS | ✅ | ✅ |
| **Consultar, editar o revisar** un ROS | ✅ | ❌ (es confidencial) |
| Descargar el **PDF** de un formato aprobado | ✅ | ✅ (el ROS, solo el administrador) |
| Notificaciones: ver lo **pendiente de revisión** | ✅ | ❌ |
| Notificaciones: ver **sus** formularios aprobados o rechazados | ❌ | ✅ |
| Usuarios, dependencias (editar) e historial | ✅ | ❌ |
| Editar **su propio** nombre y correo, y cambiar **su** contraseña | ✅ | ✅ |
| Cambiar su propio usuario, rol o estado | ❌ | ❌ (solo otro administrador) |

Los permisos se editan en `sarlaft-api/src/recursos.php` (listas `permisos` de cada recurso).
Las rutas del perfil propio (`/auth/perfil`, `/auth/cambiar-password`) solo actúan sobre la cuenta de quien tiene la sesión.

## Reglas de negocio de cada formato

| Formato | Reglas |
|---|---|
| **FO-15** Individual | Aplica desde **$ 5.000.000**. Quien paga es un declarante; el formulario muestra su identificación, teléfono, correo y dirección. Exige la autorización de datos personales. |
| **FO-13** Ausencia | El responsable (declarante) certifica que en el periodo no hubo transacciones. «Hasta» no puede ser anterior a «Desde» ni futuro. |
| **FO-14** ROS | Se puede enviar como **reporte anónimo** (sin declarante). El gestor solo ve una confirmación con el consecutivo; el detalle es solo del administrador. Los ROS no aparecen en la «actividad reciente» de un gestor ni en sus notificaciones. |
| **FO-16** Múltiples | Una fila por transacción del **mismo tercero** (misma identificación). La API calcula el total, el número de transacciones y si **supera el umbral** de **$ 25.000.000**. Bajo el umbral se puede guardar, con aviso. |
| **FO-09** Vinculación | Persona **natural o jurídica**: al elegir una, el formulario muestra solo sus secciones (la jurídica agrega representante legal y accionistas con más del 5%). La información financiera, las operaciones internacionales, las 6 preguntas PEP, la declaración de origen de fondos y la autorización de datos son obligatorias. Si alguna respuesta PEP es «Sí», el detalle es obligatorio y la lista muestra **«Posible PEP»**. El nombre del tercero, su documento y la alerta PEP los calcula la API. |

### Umbrales (dónde cambiarlos)

| Umbral | Valor | Fuente | Archivos |
|---|---|---|---|
| Transacción individual | $ 5.000.000 | Formato E-PL-FO-15 y Anexo 2 UIAF | `UMBRAL_EFECTIVO` en `sarlaft-api/src/recursos.php` y en `src/app/shared/services/transacciones.ts` |
| Transacciones múltiples | $ 25.000.000 | Anexo 2 UIAF (Circular 009 de 2016, Supersalud, procedimientos médicos) | `UMBRAL_MULTIPLES` en `recursos.php` y en `src/app/shared/services/transacciones-multiples.ts` |

> El umbral de múltiples debe confirmarse con el Oficial de Cumplimiento: el anexo es de 2016 y existe otro anexo para pagos a proveedores.
> Al cambiar un umbral hay que editar **los dos archivos** (API y Angular).

## PDF de los formatos aprobados

En el detalle de un formato **aprobado** aparece el botón **«Descargar PDF»**. Lleva a un documento (sin menú ni encabezado de la aplicación)
con el encabezado oficial (logo, `PLANEACIÓN`, código, versión, título y fecha de aprobación), todas las secciones del formato y un recuadro
**«Revisión y aprobación»** con quién aprobó, cuándo, su observación y una línea para la firma y el sello del Oficial de Cumplimiento.
Abre el diálogo de impresión del navegador: se elige **«Guardar como PDF»**. El nombre sugerido del archivo es `CÓDIGO CONSECUTIVO` (por ejemplo `E-PL-FO-09 VT-0001`).

| Tema | Detalle |
|---|---|
| Rutas | `/documento/transacciones/:id`, `/documento/ausencias/:id`, `/documento/reportes-ros/:id` (solo admin), `/documento/transacciones-multiples/:id`, `/documento/vinculacion-terceros/:id`. Están en `app.routes.ts` **fuera** del bloque del `Layout`, con `data: { pdf: true }`. |
| Componente | Es el mismo detalle genérico (`formulario-detalle`) en «modo documento»: reutiliza las secciones y tablas de cada formato, así que lo que se ve en pantalla y en el PDF sale de una sola configuración. |
| Encabezado oficial | Se define en `src/app/core/documentos.ts` (código, versión, título y `fechaAprobacion`). **Completa la fecha de aprobación de cada formato**: si falta, el PDF no muestra esa fila y no inventa una fecha. |
| Impresión | Estilos `@page` y `@media print` al final de `src/styles.css`. El encabezado y el pie oficiales **se repiten en cada hoja**; las secciones no se parten a la mitad. |
| Solo aprobados | Un formato pendiente o rechazado muestra un aviso en lugar del documento. |
| Misma pestaña | El documento se abre en la **misma pestaña**: la sesión vive en `sessionStorage`, que el navegador no copia a pestañas nuevas. |

Limitaciones actuales: el PDF **no se guarda en el servidor** (se genera en el equipo de quien lo pide), **no lleva firma digital** (trae la línea para firma y sello
físicos) y **no deja registro en el historial** de quién lo descargó.

## Notificaciones y menú de configuración

**Campana** (`GET /notificaciones`):

| Rol | Qué muestra | El número |
|---|---|---|
| Administrador | Los formularios **pendientes de revisión** de todos los módulos (incluido el ROS), los más recientes primero. Marca con **«Posible PEP»** las vinculaciones con alerta. | El total de pendientes; baja a medida que los revisa. |
| Gestor | **Sus** formularios que ya fueron aprobados o rechazados en los últimos 30 días. El rechazado muestra el **motivo**; el aprobado avisa que ya puede descargar el PDF. El ROS nunca aparece. | Lo que aún no ha visto; se apaga al abrir la campana. |

- «Sus» formularios se deducen del historial (quien registró la **Creación**).
- Se actualiza al abrir la campana, al navegar entre pantallas (máximo cada 15 s) y cada 2 minutos.
- «Lo que ya vi» se guarda **en el navegador** (`localStorage`, clave `sarlaft_notif_vistas_<usuario>`): si el gestor entra desde otro computador, verá las notificaciones como nuevas.
- «Hace cuánto» lo calcula la **base de datos** (`TIMESTAMPDIFF`), así no depende de la zona horaria del navegador ni del hosting.

**Rueda de configuración:** abre un menú con el nombre y el rol de quien tiene la sesión, «Mi perfil y contraseña» y «Cerrar sesión». El administrador ve además Usuarios, Dependencias e Historial de auditoría.
Ambos paneles se cierran con `Escape`, con un clic fuera o al elegir una opción, y solo uno puede estar abierto a la vez.

## Imagen corporativa

El logo del hospital está en `public/logo-hsjg.png` (PNG con fondo transparente). Se usa en la pantalla de inicio de sesión y en el encabezado del PDF,
siempre sobre fondo blanco para que se lea. La paleta del login y de la aplicación es gris oscuro, naranja de acento y grises azulados.
Para mostrar el logo en la pestaña del navegador, en `src/index.html`: `<link rel="icon" type="image/png" href="logo-hsjg.png">`.

## Estructura del proyecto

```
sarlatf/                                  ← Angular
├── .postcssrc.json                       ← activa Tailwind (no borrar)
├── public/
│   └── logo-hsjg.png                     ← logo del hospital (login y PDF)
├── src/
│   ├── styles.css                        ← Tailwind + clases .campo, .campo-area, .etiqueta, .seccion-titulo + estilos de impresión
│   └── app/
│       ├── app.routes.ts                 ← todas las rutas y guardias (incluidas las de /documento/...)
│       ├── core/                         ← sesión, guardias, interceptor, utilidades
│       │   ├── api.config.ts             ← URL de la API (API_URL)
│       │   ├── auth.service.ts · auth.guard.ts · auth.interceptor.ts
│       │   ├── recurso-api.ts            ← clase base de los servicios (listar, obtener, crear...)
│       │   ├── formato.ts                ← pesos, fechas, periodos, colores de estado
│       │   ├── constantes.ts             ← entidad y tipos de documento
│       │   ├── autorizacion.ts           ← texto de autorización de datos personales
│       │   ├── buscador-declarantes.ts   ← lógica del selector de declarantes
│       │   ├── campo-def.ts              ← definición de campos: crea controles, validaciones y textos
│       │   └── documentos.ts             ← encabezado oficial de cada formato para el PDF (código, versión, fecha)
│       ├── shared/
│       │   ├── components/               ← layout, sidebar, header (campana y rueda), footer, stat-card, campo, campos-dinamicos
│       │   └── services/                 ← un servicio por recurso de la API (y perfil.ts, notificaciones.ts)
│       └── bussiness/
│           ├── formularios/              ← lista y detalle GENÉRICOS de los formatos (el detalle también hace de «documento» PDF)
│           ├── transacciones/            ← FO-15 (lista, formulario, detalle genérico)
│           ├── ausencias/                ← FO-13 (ausencias.ts, ausencias-detalle.ts, ausencias-form.ts)
│           ├── reportes-ros/             ← FO-14
│           ├── multiples/                ← FO-16
│           ├── vinculacion/              ← FO-09 (campos, lista, detalle, formulario)
│           ├── declarantes/ · dependencias/ · usuarios/ · historial/
│           └── login/ · dashboard/ · profile/ · proximamente/

sarlaft-api/                              ← PHP
├── index.php                             ← enrutador
├── config.php                            ← claves (NO subir a GitHub)
├── LEEME.txt
├── src/
│   ├── Core.php                          ← Config, Db, Request, Response, Cors, Errores
│   ├── Seguridad.php                     ← JWT, roles, historial
│   ├── Validator.php                     ← validación por tipo
│   ├── Recurso.php                       ← CRUD genérico dirigido por configuración
│   ├── recursos.php                      ← definición de cada recurso, permisos y reglas
│   └── Controladores.php                 ← sesión (login, perfil, contraseña), dashboard y notificaciones
└── tools/generar_hash.php                ← genera un hash de contraseña
```

## Puesta en marcha (local)

### 1. Base de datos

1. Inicia **Apache** y **MySQL** en XAMPP.
2. En phpMyAdmin crea la base `sistemasarlaft` (cotejamiento `utf8mb4_unicode_ci`).
3. Selecciona la base e importa `sarlaft_esquema.sql`. Ya incluye todas las tablas y la vista; es seguro repetirlo.
4. Crea el primer administrador:

```powershell
C:\xampp\php\php.exe sarlaft-api\tools\generar_hash.php "TuClaveSegura123"
```

```sql
INSERT INTO usuarios (nombre, usuario, password, rol, estado)
VALUES ('Administrador', 'admin', 'PEGA_AQUI_EL_HASH', 'Administrador', 1);
```

### 2. API

1. Copia `sarlaft-api` a `C:\xampp\htdocs\sarlaft-api`.
2. Edita `config.php`:

```php
'db' => ['host' => 'localhost', 'name' => 'sistemasarlaft', 'user' => 'root', 'pass' => ''],
'jwt' => ['secret' => 'una-clave-larga-de-minimo-40-caracteres', 'ttl_horas' => 8],
'cors' => ['origenes' => ['http://localhost:4200']],
'debug' => false,
```

3. Prueba <http://localhost/sarlaft-api/>: debe responder `{"success":true,"data":{"servicio":"API SARLAFT",...}}`.

### 3. Angular

```powershell
npm install
ng serve
```

Abre <http://localhost:4200>. La URL de la API está en `src/app/core/api.config.ts`.

## Base de datos

| Tabla | Para qué sirve |
|---|---|
| `dependencias` | Áreas (Financiera, Tesorería, Facturación...). Alimentan las listas de «Área responsable». |
| `usuarios` | Acceso. Rol `Administrador` o `Gestor`; `estado` activo/inactivo. |
| `declarantes` | Personas: quien paga (FO-15), responsable (FO-13), reportante (FO-14). |
| `transacciones_efectivo` | FO-15. |
| `ausencia_transacciones` | FO-13. |
| `reporte_ros` | FO-14. `id_declarante` puede ser vacío (reporte anónimo). |
| `transacciones_multiples` y `transacciones_multiples_detalle` | FO-16 (cabecera y una fila por transacción). |
| `vinculacion_terceros` | FO-09. La cabecera va en columnas y todas las secciones del formato en `datos` (JSON). |
| `historial` | Auditoría: módulo, registro, acción, usuario, fecha, IP, detalle. También permite saber quién creó cada formulario (para las notificaciones del gestor). |
| vista `dashboard` | Totales para las tarjetas. |

Todos los formularios comparten estas columnas: `consecutivo`, `estado` (`Pendiente`, `Aprobado`, `Rechazado`),
`usuario_revision`, `fecha_revision`, `fecha_aprobacion`, `observacion(es)_revision`, `fecha_registro`, `ip`, `archivo_pdf`.

### Migraciones para una base que ya existe

Si importaste el esquema completo, **no necesitas nada de esto**. Si tu base es anterior, ejecuta en este orden
(haz copia de seguridad antes, phpMyAdmin → Exportar):

<details>
<summary>1) FO-15: columnas nuevas en transacciones_efectivo</summary>

```sql
ALTER TABLE transacciones_efectivo
  ADD COLUMN IF NOT EXISTS area_responsable    VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS periodo_reporte     VARCHAR(7)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_elaboracion   DATE         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_operacion      VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_operacion_otro VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS numero_factura      VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS concepto_pago       TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS barrio              VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS relacion_paciente   VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS senales_alerta      TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS titular_nombre      VARCHAR(200) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS titular_documento   VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS autoriza_datos      CHAR(2)      DEFAULT NULL;
```

`IF NOT EXISTS` funciona en MariaDB (XAMPP). En MySQL puro quítalo y agrega solo las columnas que falten.
</details>

<details>
<summary>2) FO-13 y FO-14</summary>

```sql
ALTER TABLE ausencia_transacciones
  ADD COLUMN IF NOT EXISTS entidad           VARCHAR(200) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS area_proceso      VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_elaboracion DATE         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS declaracion       CHAR(2)      DEFAULT NULL;

-- El reportante de un ROS puede ser anónimo
ALTER TABLE reporte_ros MODIFY id_declarante INT(11) NULL;
```
</details>

<details>
<summary>3) FO-16: dos tablas nuevas</summary>

```sql
CREATE TABLE IF NOT EXISTS transacciones_multiples (
  id_multiple          INT(11)       NOT NULL AUTO_INCREMENT,
  consecutivo          VARCHAR(20)   NOT NULL,
  area_responsable     VARCHAR(150)  DEFAULT NULL,
  periodo_reporte      VARCHAR(7)    DEFAULT NULL,
  fecha_elaboracion    DATE          DEFAULT NULL,
  periodo_acumulado    VARCHAR(10)   DEFAULT NULL,
  nombre_diligencia    VARCHAR(200)  DEFAULT NULL,
  tercero_nombre       VARCHAR(200)  DEFAULT NULL,
  tercero_tipo_id      VARCHAR(30)   DEFAULT NULL,
  tercero_numero_id    VARCHAR(30)   DEFAULT NULL,
  total_acumulado      DECIMAL(18,2) NOT NULL DEFAULT 0,
  num_transacciones    INT(11)       NOT NULL DEFAULT 0,
  supera_umbral        CHAR(2)       DEFAULT NULL,
  archivo_pdf          VARCHAR(255)  DEFAULT NULL,
  fecha_registro       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip                   VARCHAR(50)   DEFAULT NULL,
  estado               ENUM('Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  observacion_revision TEXT          DEFAULT NULL,
  usuario_revision     INT(11)       DEFAULT NULL,
  fecha_revision       DATETIME      DEFAULT NULL,
  fecha_aprobacion     DATETIME      DEFAULT NULL,
  PRIMARY KEY (id_multiple),
  UNIQUE KEY uq_tm_consecutivo (consecutivo),
  KEY idx_tm_revisor (usuario_revision),
  KEY idx_tm_estado (estado),
  CONSTRAINT fk_tm_revisor FOREIGN KEY (usuario_revision) REFERENCES usuarios (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transacciones_multiples_detalle (
  id_detalle            INT(11)       NOT NULL AUTO_INCREMENT,
  id_multiple           INT(11)       NOT NULL,
  orden                 INT(11)       NOT NULL,
  fecha                 DATE          NOT NULL,
  nombre_pagador        VARCHAR(200)  NOT NULL,
  tipo_identificacion   VARCHAR(30)   NOT NULL,
  numero_identificacion VARCHAR(30)   NOT NULL,
  numero_factura        VARCHAR(50)   NOT NULL,
  concepto              TEXT          NOT NULL,
  valor                 DECIMAL(18,2) NOT NULL,
  observaciones         TEXT          DEFAULT NULL,
  PRIMARY KEY (id_detalle),
  KEY idx_tmd_multiple (id_multiple),
  CONSTRAINT fk_tmd_multiple FOREIGN KEY (id_multiple) REFERENCES transacciones_multiples (id_multiple)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
</details>

<details>
<summary>4) FO-09: una tabla nueva</summary>

```sql
CREATE TABLE IF NOT EXISTS vinculacion_terceros (
  id_vinculacion         INT(11)      NOT NULL AUTO_INCREMENT,
  consecutivo            VARCHAR(20)  NOT NULL,
  tipo_solicitud         VARCHAR(30)  NOT NULL,
  clase_vinculacion      VARCHAR(20)  NOT NULL,
  tipo_persona           VARCHAR(10)  NOT NULL,
  fecha_diligenciamiento DATE         NOT NULL,
  tercero_nombre         VARCHAR(250) DEFAULT NULL,
  tercero_tipo_id        VARCHAR(30)  DEFAULT NULL,
  tercero_numero_id      VARCHAR(30)  DEFAULT NULL,
  alerta_pep             CHAR(2)      DEFAULT NULL,
  datos                  LONGTEXT     NOT NULL,
  archivo_pdf            VARCHAR(255) DEFAULT NULL,
  fecha_registro         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip                     VARCHAR(50)  DEFAULT NULL,
  estado                 ENUM('Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'Pendiente',
  observacion_revision   TEXT         DEFAULT NULL,
  usuario_revision       INT(11)      DEFAULT NULL,
  fecha_revision         DATETIME     DEFAULT NULL,
  fecha_aprobacion       DATETIME     DEFAULT NULL,
  PRIMARY KEY (id_vinculacion),
  UNIQUE KEY uq_vt_consecutivo (consecutivo),
  KEY idx_vt_revisor (usuario_revision),
  KEY idx_vt_estado (estado),
  KEY idx_vt_tercero (tercero_numero_id),
  CONSTRAINT fk_vt_revisor FOREIGN KEY (usuario_revision) REFERENCES usuarios (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
</details>

Las migraciones solo **agregan** columnas o tablas: no borran datos ni rompen los formularios de la página web.
Si el formulario web inserta en estas tablas, debe llenar también las columnas nuevas.
El PDF y las notificaciones **no necesitan cambios en la base de datos**.

## API REST

Base: `http://localhost/sarlaft-api` · Formato de respuesta: `{ "success": true, "data": ..., "meta": { "total", "limit", "offset" } }`.
Los errores traen `message` y, si es de validación (422), `errors` por campo. Todas las rutas, salvo el login,
exigen `Authorization: Bearer <token>`.

| Recurso | Rutas |
|---|---|
| Sesión | `POST /auth/login` · `GET /auth/me` |
| Perfil propio | `GET /auth/perfil` · `PUT /auth/perfil` (nombre y correo) · `POST /auth/cambiar-password` (`{actual, nueva}`) |
| Dashboard | `GET /dashboard` |
| Notificaciones | `GET /notificaciones` (administrador: pendientes de revisión; gestor: sus formularios ya revisados) |
| Declarantes | `GET, POST /declarantes` · `GET, PUT, DELETE /declarantes/{id}` |
| Dependencias | `GET, POST /dependencias` · `GET, PUT, DELETE /dependencias/{id}` |
| Usuarios (solo Admin) | `GET, POST /usuarios` · `GET, PUT, DELETE /usuarios/{id}` |
| FO-15 | `/transacciones` y `PATCH /transacciones/{id}/revision` |
| FO-13 | `/ausencias` y `PATCH /ausencias/{id}/revision` |
| FO-14 | `/reportes-ros` y `PATCH /reportes-ros/{id}/revision` (el gestor solo puede `POST`) |
| FO-16 | `/transacciones-multiples` y `PATCH /transacciones-multiples/{id}/revision` |
| FO-09 | `/vinculacion-terceros` y `PATCH /vinculacion-terceros/{id}/revision` |
| Historial (solo Admin) | `GET /historial` · `GET /historial/{id}` |

Los cinco formatos tienen las mismas operaciones: `GET` lista, `POST` crea, `GET/PUT/DELETE` por `{id}`, y `PATCH .../revision`
con `{ "estado": "Aprobado|Rechazado|Pendiente", "observacion": "..." }` (rechazar exige el motivo).

**Filtros de las listas:** `?q=texto` · `?estado=Pendiente` · `?desde=2026-10-01&hasta=2026-10-31` · `?limit=50&offset=0`
(en el historial además `?modulo=` `?accion=` `?usuario=`; en FO-09 además `?clase=Proveedor` `?persona=Jurídica` `?pep=SI`).

**Transacciones múltiples:** las filas viajan en la lista `detalles` del mismo registro. Al editar, si se envía `detalles` se reemplazan todas
y se recalculan los totales. Los totales (`total_acumulado`, `num_transacciones`, `supera_umbral`) los calcula siempre el servidor.

**Vinculación de terceros:** las secciones del formato (persona, representante, tributaria, financiera, accionistas, internacional, PEP,
origen de fondos, autorización y firma) viajan en el bloque `formulario`. La API las valida campo por campo y devuelve los errores
como `persona.nombres`, `accionistas.0.porcentaje`, `pep.detalle`, etc. El nombre del tercero, su documento y `alerta_pep` los calcula el servidor.

**Cambio de contraseña:** una contraseña actual incorrecta responde **422** (no 401, que cerraría la sesión). La contraseña nunca se guarda en el historial.

**Notificaciones:** devuelve `{ rol, pendientes_total, items[] }`. Cada ítem trae `tipo`, `ruta`, `id`, `consecutivo`, `fecha` y `segundos` (hace cuánto, según el reloj de la base de datos);
el administrador recibe además `alerta_pep` y el gestor `estado` y `observacion`. Muestra como máximo 8 ítems.

## Cómo agregar un formato nuevo

1. **Base de datos:** crea la tabla con las columnas comunes de los formularios.
2. **API:** en `recursos.php` define el recurso con `$formulario(...)` (campos, reglas, prefijo del consecutivo) y agrégalo al `return`.
   Si el formato tiene filas o muchas secciones, usa la clave `hijos` (ver FO-16 y FO-09).
3. **Servicio:** `shared/services/nombre.ts` con `class NombreService extends FormularioApi<Tipo, Entrada>`.
4. **Lista y detalle:** dos componentes pequeños que solo declaran la configuración (`ConfigLista`, `ConfigDetalle`) y usan
   `<app-formulario-lista>` y `<app-formulario-detalle>`.
5. **Formulario:** componente con `FormBuilder`; usa `<app-campo>` y las clases `campo`, `campo-area`, `etiqueta`, `seccion-titulo`.
   Para formatos largos, define los campos como lista (`CampoDef`, ver `vinculacion-campos.ts`) y usa `construirGrupo()` y `<app-campos-dinamicos>`:
   una sola definición crea los controles, las validaciones, el dibujo y el detalle.
6. **Rutas y menú:** `nuevo` va **antes** de `:id` en `app.routes.ts`; agrega el ítem en `sidebar.ts`.
7. **PDF:** agrega el formato en `src/app/core/documentos.ts` (código, versión, título, fecha de aprobación) y una ruta `documento/<modulo>/:id`
   con `data: { pdf: true }`, fuera del `Layout`, que cargue el mismo componente de detalle.
8. **Notificaciones:** agrega el módulo a las consultas de `NotificacionesController` en `Controladores.php` (pendientes del administrador y revisados del gestor).
   Si el formato es confidencial, déjalo fuera de la consulta del gestor, como el ROS.

## Convenciones del código

- Angular **sin zone.js**: los cambios que llegan de HTTP deben ir en señales (`signal`, `computed`).
- Los modales usan el elemento nativo `<dialog>` (cierra con Escape y atrapa el foco).
- Los mensajes de éxito pasan por `history.state` al navegar y se limpian para que no reaparezcan al recargar.
- Los errores de la API se muestran junto al campo (`control.setErrors({ servidor: texto })`).
- Los campos que dependen de otra respuesta (por ejemplo «¿Cuál?») se definen con `visibleSi`; solo son obligatorios mientras se ven.
- Lo que no debe salir en el PDF lleva la clase `no-imprimir`; lo que no debe partirse entre hojas, `evitar-corte`.
- Los archivos de un componente van **planos** dentro de su carpeta. Si usas `ng generate`, agrega `--flat`:

```bash
ng g c bussiness/carpeta/nombre --flat --skip-tests --style=none
```

## Seguridad

- `sarlaft-api/config.php` tiene las claves: **no se sube a GitHub**. Agrega a `.gitignore`: `sarlaft-api/config.php`.
- Usa **HTTPS** en el hosting y `'debug' => false` en producción.
- El `jwt.secret` debe tener al menos 40 caracteres; si lo cambias, se cierran todas las sesiones.
- Las contraseñas se guardan con hash (bcrypt). La sesión del navegador vive en `sessionStorage` y se cierra al cerrar la pestaña.
- Cambiar la contraseña **no cierra las demás sesiones abiertas**: siguen válidas hasta que venza su token (8 horas por defecto).
- Cada creación, cambio, eliminación, revisión, cambio de perfil o de contraseña e inicio de sesión queda en `historial` con usuario e IP.
- Los ROS son confidenciales: ver la tabla de permisos. El FO-09 guarda datos financieros y de PEP: conviene definir quién puede verlos.
- El PDF de un formato lo genera el navegador con los datos que el usuario ya puede ver: no abre ningún acceso nuevo, pero tampoco queda registro de la descarga.

## Despliegue en el hosting

1. `ng build --configuration production` y sube el contenido de `dist/.../browser` a `public_html`.
2. Sube `sarlaft-api` a `public_html/sarlaft-api`, con el `.htaccess` oculto, y edita `config.php` (usuario y clave de la base,
   `jwt.secret`, y en `cors.origenes` el dominio real).
3. Cambia `API_URL` en `src/app/core/api.config.ts` por `https://TU-DOMINIO.com/sarlaft-api` **antes** de compilar.
4. Para que las rutas de Angular funcionen al recargar (incluidas las de `/documento/...`), agrega este `.htaccess` junto al `index.html`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/sarlaft-api/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Al guardar sale **500** | Falta una columna o tabla, o hay un error de PHP | `'debug' => true` en `config.php`, repetir y leer el campo `debug` de la respuesta (pestaña Network → Response). Volver a `false`. |
| `/vinculacion-terceros` da 500 | Falta crear la tabla `vinculacion_terceros` | Ejecutar la migración 4. |
| `Undefined constant "UMBRAL_EFECTIVO"` (o `UMBRAL_MULTIPLES`) | Falta la constante al inicio de `recursos.php` | Definirla antes de `function recursos()`. |
| Los campos salen sin borde ni estilo | Falta el bloque `@layer components` en `styles.css` o `.postcssrc.json` | Ver la sección de estructura. |
| `Property 'fr' ...` en `formulario-detalle.html` | El bloque de la tabla quedó fuera de `@else if (f(); as fr)` | Debe ir entre las secciones y «Revisión». |
| `[x: string]: any;` dentro de una clase | El editor «arregló» un error ocultándolo | Borrar esa línea y corregir el error real. |
| Un gestor en «Reportes ROS» cae en el dashboard | El menú o el guardia no están actualizados | `sidebar.html` debe usar `destino(item)` y la ruta usar `rosListaGuard`. |
| «Mi perfil» dice «Recurso no encontrado» | Las rutas `perfil` quedaron **dentro** del bloque de `me` en `AuthController::manejar` | Deben ser bloques `if` separados, al mismo nivel, antes del `throw`. |
| `Could not resolve "./bussiness/.../xxx-detalle"` | El nombre del archivo en la ruta no coincide con el de tu proyecto (por ejemplo `ausencias-detalle`, en plural) | Copiar el `loadComponent` de la ruta normal del mismo módulo, que ya funciona. |
| No aparece el botón «Descargar PDF» | El formato no está **aprobado**, o su ruta no está en `DOCUMENTOS` (`core/documentos.ts`) | Aprobarlo; revisar que la clave coincida con la ruta del módulo (por ejemplo `/vinculacion-terceros`). |
| El PDF pide iniciar sesión | El documento se abrió en una pestaña nueva (`sessionStorage` no se copia) | Abrirlo desde el botón «Descargar PDF», en la misma pestaña. |
| El PDF no muestra la fecha de aprobación | Falta `fechaAprobacion` del formato en `core/documentos.ts` | Agregar la fecha oficial del formato (`dd/mm/aaaa`). |
| El PDF sale con menú o fondos grises | Faltan los estilos de impresión al final de `styles.css` | Agregar el bloque `@page` y `@media print`. |
| La campana no muestra número | No hay nada pendiente (administrador) o nada nuevo (gestor), o falta la ruta `notificaciones` en `index.php` | Probar `GET /notificaciones` con el token; si da 404, agregar el bloque en `index.php`. |
| «hace 5 h» en algo recién creado | La API es una versión anterior (calculaba la hora en el navegador) | Actualizar `NotificacionesController`: debe devolver `segundos`. |
| Tras renombrar archivos no compila | `ng serve` quedó con nombres viejos | `Ctrl+C`, volver a ejecutar `ng serve` y `Ctrl+Shift+R`. |
| El logo no aparece en el login ni en el PDF | El archivo no está en `public/` o tiene otro nombre | Debe llamarse `public/logo-hsjg.png`; probar `http://localhost:4200/logo-hsjg.png`. |
| Error de CORS | El origen de Angular no está en `config.php` | Agregarlo a `cors.origenes`. |

## Pendientes

- **Fechas de aprobación de los formatos:** completar `fechaAprobacion` (y confirmar `version`) de FO-13, 14, 15 y 16 en `core/documentos.ts`; hoy solo está la del FO-09.
- **Guardar el PDF en el servidor** (columna `archivo_pdf`) y **registrar en el historial** quién lo descargó. Es la misma pieza que los anexos.
- **Anexos de evidencia:** subir y servir archivos de forma segura para el ROS (FO-14) y el escaneado firmado del FO-09.
- **Rol de Oficial de Cumplimiento:** que los ROS y los datos PEP/financieros del FO-09 —y la aprobación que aparece en el PDF— sean de ese rol y no de cualquier administrador.
- **Parte web pública:** actualizar el formulario de la página del hospital para que llene las columnas nuevas y cumpla las mismas reglas.
- **Dashboard:** incluir las transacciones múltiples y las vinculaciones en las tarjetas y en la actividad reciente; tarjetas clicables que lleven a la lista filtrada.
- **Buscador del encabezado:** el cuadro «Buscar» todavía no hace nada; conectarlo a la búsqueda por consecutivo, nombre o documento.
- **Notificaciones:** guardar en el servidor lo que cada gestor ya vio (hoy se recuerda por navegador).
- **Paginación en Declarantes y Dependencias** (hoy cargan la lista completa).
- **Seguridad:** limitar los intentos de inicio de sesión y cerrar las demás sesiones al cambiar la contraseña.
- **Confirmar con el Oficial de Cumplimiento** el umbral de $ 25.000.000 de las transacciones múltiples.
