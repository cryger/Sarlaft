# SARLAFT · Sistema interno

Sistema interno de la **E.S.E. Hospital San José del Guaviare** para gestionar los formatos del
Sistema de Administración del Riesgo de Lavado de Activos y de la Financiación del Terrorismo (SARLAFT).

> Última actualización: 14/10/2026

## Qué incluye

| Módulo | Formato | Ruta | Prefijo | Tabla | Quién lo usa |
|---|---|---|---|---|---|
| Transacciones en efectivo | **E-PL-FO-15** Transacción individual en efectivo | `/transacciones` | `TE-` | `transacciones_efectivo` | Admin y Gestor |
| Ausencias | **E-PL-FO-13** Ausencia de transacciones en efectivo | `/ausencias` | `AT-` | `ausencia_transacciones` | Admin y Gestor |
| Reportes ROS | **E-PL-FO-14** Operación intentada, inusual o sospechosa | `/reportes-ros` | `ROS-` | `reporte_ros` | Gestor **envía**; solo Admin consulta |
| Transacciones múltiples | **E-PL-FO-16** Transacciones múltiples | `/transacciones-multiples` | `TM-` | `transacciones_multiples` + `_detalle` | Admin y Gestor |
| Declarantes | Personas que pagan, reportan o responden | `/declarantes` | — | `declarantes` | Admin y Gestor |
| Dependencias | Áreas del hospital | `/dependencias` | — | `dependencias` | Admin (edita) |
| Usuarios | Acceso al sistema | `/usuarios` | — | `usuarios` | Solo Admin |
| Historial de auditoría | Quién hizo qué y cuándo (solo lectura) | `/historial` | — | `historial` | Solo Admin |
| Dashboard | Indicadores y actividad reciente | `/dashboard` | — | vista `dashboard` | Admin y Gestor |

Los formatos oficiales están publicados en <https://esehospitalguaviare.gov.co/sarlaft/58>.
Los usuarios externos reportan desde esa página web; este sistema es para el personal interno y comparte la misma base de datos.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | Angular 22 (componentes standalone, señales, sin zone.js), Tailwind CSS v4, TypeScript |
| Backend | API REST en PHP 8.1+ (PDO, sin frameworks), autenticación JWT HS256 propia |
| Base de datos | MySQL / MariaDB (InnoDB, utf8mb4), base `sistemasarlaft` |
| Desarrollo local | XAMPP (Apache + MariaDB), Angular en `http://localhost:4200` |

## Roles y permisos

| Acción | Administrador | Gestor |
|---|:-:|:-:|
| Ver listas y detalles de transacciones, ausencias y múltiples | ✅ | ✅ |
| Crear formularios | ✅ | ✅ |
| Editar formularios **pendientes** | ✅ | ✅ |
| Editar formularios aprobados o rechazados | ✅ | ❌ |
| Aprobar, rechazar o volver a pendiente | ✅ | ❌ |
| Eliminar | ✅ | ❌ |
| **Enviar** un ROS | ✅ | ✅ |
| **Consultar, editar o revisar** un ROS | ✅ | ❌ (es confidencial) |
| Usuarios, dependencias (editar) e historial | ✅ | ❌ |

Los permisos se editan en `sarlaft-api/src/recursos.php` (listas `permisos` de cada recurso).

## Reglas de negocio de cada formato

| Formato | Reglas |
|---|---|
| **FO-15** Individual | Aplica desde **$ 5.000.000**. Quien paga es un declarante; el formulario muestra su identificación, teléfono, correo y dirección. Exige la autorización de datos personales. |
| **FO-13** Ausencia | El responsable (declarante) certifica que en el periodo no hubo transacciones. «Hasta» no puede ser anterior a «Desde» ni futuro. |
| **FO-14** ROS | Se puede enviar como **reporte anónimo** (sin declarante). El gestor solo ve una confirmación con el consecutivo; el detalle es solo del administrador. Los ROS no aparecen en la «actividad reciente» de un gestor. |
| **FO-16** Múltiples | Una fila por transacción del **mismo tercero** (misma identificación). La API calcula el total, el número de transacciones y si **supera el umbral** de **$ 25.000.000**. Bajo el umbral se puede guardar, con aviso. |

### Umbrales (dónde cambiarlos)

| Umbral | Valor | Fuente | Archivos |
|---|---|---|---|
| Transacción individual | $ 5.000.000 | Formato E-PL-FO-15 y Anexo 2 UIAF | `UMBRAL_EFECTIVO` en `sarlaft-api/src/recursos.php` y en `src/app/shared/services/transacciones.ts` |
| Transacciones múltiples | $ 25.000.000 | Anexo 2 UIAF (Circular 009 de 2016, Supersalud, procedimientos médicos) | `UMBRAL_MULTIPLES` en `recursos.php` y en `src/app/shared/services/transacciones-multiples.ts` |

> El umbral de múltiples debe confirmarse con el Oficial de Cumplimiento: el anexo es de 2016 y existe otro anexo para pagos a proveedores.
> Al cambiar un umbral hay que editar **los dos archivos** (API y Angular).

## Estructura del proyecto

```
sarlatf/                                  ← Angular
├── .postcssrc.json                       ← activa Tailwind (no borrar)
├── src/
│   ├── styles.css                        ← Tailwind + clases .campo, .campo-area, .etiqueta, .seccion-titulo
│   └── app/
│       ├── app.routes.ts                 ← todas las rutas y guardias
│       ├── core/                         ← sesión, guardias, interceptor, utilidades
│       │   ├── api.config.ts             ← URL de la API (API_URL)
│       │   ├── auth.service.ts · auth.guard.ts · auth.interceptor.ts
│       │   ├── recurso-api.ts            ← clase base de los servicios (listar, obtener, crear...)
│       │   ├── formato.ts                ← pesos, fechas, periodos, colores de estado
│       │   ├── constantes.ts             ← entidad y tipos de documento
│       │   ├── autorizacion.ts           ← texto de autorización de datos personales
│       │   └── buscador-declarantes.ts   ← lógica del selector de declarantes
│       ├── shared/
│       │   ├── components/               ← layout, sidebar, header, footer, stat-card, campo
│       │   └── services/                 ← un servicio por recurso de la API
│       └── bussiness/
│           ├── formularios/              ← lista y detalle GENÉRICOS de los formatos
│           ├── transacciones/            ← FO-15 (lista, formulario, detalle)
│           ├── ausencias/                ← FO-13
│           ├── reportes-ros/             ← FO-14
│           ├── multiples/                ← FO-16
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
│   └── Controladores.php                 ← login y dashboard
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
'db' => ['host' => 'localhost', 'name' => 'esehsjg18_sistemasarlaft', 'user' => 'root', 'pass' => ''],
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
| `historial` | Auditoría: módulo, registro, acción, usuario, fecha, IP, detalle. |
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

Las migraciones solo **agregan** columnas o tablas: no borran datos ni rompen los formularios de la página web.
Si el formulario web inserta en estas tablas, debe llenar también las columnas nuevas.

## API REST

Base: `http://localhost/sarlaft-api` · Formato de respuesta: `{ "success": true, "data": ..., "meta": { "total", "limit", "offset" } }`.
Los errores traen `message` y, si es de validación (422), `errors` por campo. Todas las rutas, salvo el login,
exigen `Authorization: Bearer <token>`.

| Recurso | Rutas |
|---|---|
| Sesión | `POST /auth/login` · `GET /auth/me` |
| Dashboard | `GET /dashboard` |
| Declarantes | `GET, POST /declarantes` · `GET, PUT, DELETE /declarantes/{id}` |
| Dependencias | `GET, POST /dependencias` · `GET, PUT, DELETE /dependencias/{id}` |
| Usuarios (solo Admin) | `GET, POST /usuarios` · `GET, PUT, DELETE /usuarios/{id}` |
| FO-15 | `/transacciones` y `PATCH /transacciones/{id}/revision` |
| FO-13 | `/ausencias` y `PATCH /ausencias/{id}/revision` |
| FO-14 | `/reportes-ros` y `PATCH /reportes-ros/{id}/revision` (el gestor solo puede `POST`) |
| FO-16 | `/transacciones-multiples` y `PATCH /transacciones-multiples/{id}/revision` |
| Historial (solo Admin) | `GET /historial` · `GET /historial/{id}` |

Los cuatro formatos tienen las mismas operaciones: `GET` lista, `POST` crea, `GET/PUT/DELETE` por `{id}`, y `PATCH .../revision`
con `{ "estado": "Aprobado|Rechazado|Pendiente", "observacion": "..." }` (rechazar exige el motivo).

**Filtros de las listas:** `?q=texto` · `?estado=Pendiente` · `?desde=2026-10-01&hasta=2026-10-31` · `?limit=50&offset=0`
(en el historial además `?modulo=` `?accion=` `?usuario=`).

**Transacciones múltiples:** las filas viajan en la lista `detalles` del mismo registro. Al editar, si se envía `detalles` se reemplazan todas
y se recalculan los totales. Los totales (`total_acumulado`, `num_transacciones`, `supera_umbral`) los calcula siempre el servidor.

## Cómo agregar un formato nuevo

1. **Base de datos:** crea la tabla con las columnas comunes de los formularios.
2. **API:** en `recursos.php` define el recurso con `$formulario(...)` (campos, reglas, prefijo del consecutivo) y agrégalo al `return`.
3. **Servicio:** `shared/services/nombre.ts` con `class NombreService extends FormularioApi<Tipo, Entrada>`.
4. **Lista y detalle:** dos componentes pequeños que solo declaran la configuración (`ConfigLista`, `ConfigDetalle`) y usan
   `<app-formulario-lista>` y `<app-formulario-detalle>`.
5. **Formulario:** componente con `FormBuilder`; usa `<app-campo>` y las clases `campo`, `campo-area`, `etiqueta`, `seccion-titulo`.
6. **Rutas y menú:** `nuevo` va **antes** de `:id` en `app.routes.ts`; agrega el ítem en `sidebar.ts`.

## Convenciones del código

- Angular **sin zone.js**: los cambios que llegan de HTTP deben ir en señales (`signal`, `computed`).
- Los modales usan el elemento nativo `<dialog>` (cierra con Escape y atrapa el foco).
- Los mensajes de éxito pasan por `history.state` al navegar y se limpian para que no reaparezcan al recargar.
- Los errores de la API se muestran junto al campo (`control.setErrors({ servidor: texto })`).
- Los archivos de un componente van **planos** dentro de su carpeta. Si usas `ng generate`, agrega `--flat`:

```bash
ng g c bussiness/carpeta/nombre --flat --skip-tests --style=none
```

## Seguridad

- `sarlaft-api/config.php` tiene las claves: **no se sube a GitHub**. Agrega a `.gitignore`: `sarlaft-api/config.php`.
- Usa **HTTPS** en el hosting y `'debug' => false` en producción.
- El `jwt.secret` debe tener al menos 40 caracteres; si lo cambias, se cierran todas las sesiones.
- Las contraseñas se guardan con hash (bcrypt). La sesión del navegador vive en `sessionStorage` y se cierra al cerrar la pestaña.
- Cada creación, cambio, eliminación, revisión e inicio de sesión queda en `historial` con usuario e IP.
- Los ROS son confidenciales: ver la tabla de permisos.

## Despliegue en el hosting

1. `ng build --configuration production` y sube el contenido de `dist/.../browser` a `public_html`.
2. Sube `sarlaft-api` a `public_html/sarlaft-api`, con el `.htaccess` oculto, y edita `config.php` (usuario y clave de la base,
   `jwt.secret`, y en `cors.origenes` el dominio real).
3. Cambia `API_URL` en `src/app/core/api.config.ts` por `https://TU-DOMINIO.com/sarlaft-api` **antes** de compilar.
4. Para que las rutas de Angular funcionen al recargar, agrega este `.htaccess` junto al `index.html`:

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
| Al guardar sale **500** | Falta una columna o hay un error de PHP | `'debug' => true` en `config.php`, repetir y leer el campo `debug` de la respuesta (pestaña Network → Response). Volver a `false`. |
| `Undefined constant "UMBRAL_EFECTIVO"` (o `UMBRAL_MULTIPLES`) | Falta la constante al inicio de `recursos.php` | Definirla antes de `function recursos()`. |
| Los campos salen sin borde ni estilo | Falta el bloque `@layer components` en `styles.css` o `.postcssrc.json` | Ver la sección de estructura. |
| `Property 'fr' ...` en `formulario-detalle.html` | El bloque de la tabla quedó fuera de `@else if (f(); as fr)` | Debe ir entre las secciones y «Revisión». |
| Un gestor «Reportes ROS» cae en el dashboard | El menú o el guardia no están actualizados | `sidebar.html` debe usar `destino(item)` y la ruta usar `rosListaGuard`. |
| Tras renombrar archivos no compila | `ng serve` quedó con nombres viejos | `Ctrl+C`, volver a ejecutar `ng serve` y `Ctrl+Shift+R`. |
| Error de CORS | El origen de Angular no está en `config.php` | Agregarlo a `cors.origenes`. |

## Pendientes

- **Anexos de evidencia del ROS (FO-14):** subir y servir archivos de forma segura (la columna `archivo_pdf` ya existe).
- **Dashboard:** incluir las transacciones múltiples en las tarjetas y en la actividad reciente.
- **PDF:** generar o descargar los formatos aprobados.
- **Paginación en Declarantes y Dependencias** (hoy cargan la lista completa).
