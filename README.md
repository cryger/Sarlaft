# SARLAFT

Sistema interno para la **Administración del Riesgo de Lavado de Activos y Financiación del Terrorismo (SARLAFT)**: registro de declarantes, formularios de transacciones en efectivo, ausencia de transacciones y reportes de operaciones sospechosas (ROS), con revisión por parte de un administrador y bitácora de auditoría.

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.1%2B-777BB4?logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-MariaDB-4479A1?logo=mysql&logoColor=white)

<!-- Agrega capturas en la carpeta docs/ y descomenta:
![Dashboard](docs/dashboard.png)
![Declarantes](docs/declarantes.png)
-->

> ⚠️ **Información sensible.** Este sistema maneja datos personales y reportes de riesgo. No subas a este repositorio datos reales, copias de la base de datos ni el archivo `config.php`. Si el repositorio es de uso interno, mantenlo **privado**.

---

## Estado del proyecto

| Módulo | Estado |
|---|---|
| Inicio de sesión (JWT) y roles | ✅ Listo |
| Dashboard con datos reales | ✅ Listo |
| Declarantes: lista, búsqueda, crear, editar, eliminar | ✅ Listo |
| API REST para las 8 tablas de la base de datos | ✅ Listo |
| Bitácora de auditoría (automática en la API) | ✅ Listo |
| Transacciones en efectivo (pantallas) | 🚧 La API está lista, falta la interfaz |
| Ausencia de transacciones (pantallas) | 🚧 La API está lista, falta la interfaz |
| Reportes ROS (pantallas) | 🚧 La API está lista, falta la interfaz |
| Usuarios, Dependencias, Historial (pantallas) | 🚧 La API está lista, falta la interfaz |
| Detalle de declarante | 🚧 Pendiente |
| Subida y generación de PDF | 🚧 Pendiente |

Las rutas que aún no tienen pantalla muestran el aviso «Este módulo aún no está disponible».

## Tecnologías

- **Frontend:** Angular 22 (componentes standalone, signals, sin zone.js), Tailwind CSS 4, RxJS.
- **Backend:** API REST en PHP 8.1+ (PDO, sin frameworks), autenticación con JWT (HS256).
- **Base de datos:** MySQL 5.7+ / MariaDB 10.3+ (InnoDB, `utf8mb4`).

## Arquitectura

```
Navegador ──► Angular (SPA)  ──HTTP/JSON──►  API PHP  ──PDO──►  MySQL
              :4200                          /sarlaft-api
```

Angular **no** se conecta a la base de datos: solo consume la API. La API valida los datos, aplica los permisos por rol y registra cada cambio en la tabla `historial`.

## Estructura del repositorio

```
sarlatf/
├── src/                          # Frontend Angular
│   └── app/
│       ├── core/                 # Sesión, guards, interceptor y configuración de la API
│       ├── shared/
│       │   ├── components/       # Layout, sidebar, header, footer, stat-card
│       │   └── services/         # Un servicio por tabla (declarantes, usuarios, ...)
│       └── bussiness/            # Páginas: login, dashboard, declarantes, perfil, ...
├── sarlaft-api/                  # API en PHP
│   ├── index.php                 # Punto de entrada y enrutador
│   ├── config.example.php        # Plantilla de configuración (copiar a config.php)
│   ├── src/                      # Núcleo, seguridad, validación y definición de recursos
│   └── tools/generar_hash.php    # Genera hashes de contraseña (solo por terminal)
├── database/
│   └── sarlaft_esquema.sql       # Estructura de la base de datos
└── README.md
```

## Requisitos

- **Node.js** 22.22.3 o superior (o 24.15+ / 26+) y npm — requisito de Angular 22.
- **PHP** 8.1 o superior con las extensiones `pdo_mysql`, `mbstring` y `json`.
- **MySQL o MariaDB**.
- **Apache** con `mod_rewrite` (XAMPP sirve para desarrollo local).

## Instalación local (desarrollo)

### 1. Base de datos

1. Inicia **Apache** y **MySQL** (por ejemplo desde el panel de XAMPP).
2. En `http://localhost/phpmyadmin` crea la base `esehsjg18_sistemasarlaft` (cotejamiento `utf8mb4_unicode_ci`). Puedes usar otro nombre y cambiarlo en `config.php`.
3. Selecciónala y usa **Importar** con `database/sarlaft_esquema.sql`.

### 2. API

1. Copia la carpeta `sarlaft-api` a la carpeta de sitios de Apache (`C:\xampp\htdocs\sarlaft-api` en XAMPP). Si prefieres trabajar desde la carpeta del repositorio, crea un enlace con `mklink /J` en Windows.
2. Crea tu configuración a partir de la plantilla:
   ```bash
   cd sarlaft-api
   cp config.example.php config.php      # en Windows: copy config.example.php config.php
   ```
3. Edita `config.php`:
   ```php
   'db' => [
       'host' => 'localhost',
       'name' => '',
       'user' => '',        // XAMPP
       'pass' => '',            // XAMPP viene sin clave
   ],
   'jwt'  => ['secret' => 'una-clave-larga-y-aleatoria-de-mas-de-40-caracteres'],
   'cors' => ['origenes' => ['http://localhost:4200']],
   ```
4. Comprueba que responde: abre `http://localhost/sarlaft-api/` y debes ver
   `{"success":true,"data":{"servicio":"API SARLAFT","version":"1.0.0"}}`.

### 3. Primer administrador

Genera el hash de la clave que quieras (en la carpeta `sarlaft-api`):

```bash
php tools/generar_hash.php "UnaClaveSegura123"
```

Y ejecútalo en phpMyAdmin (pestaña **SQL**) pegando el hash completo:

```sql
INSERT INTO usuarios (nombre, usuario, password, correo, rol, estado)
VALUES ('Administrador', 'admin', 'PEGA_AQUI_EL_HASH', 'admin@ejemplo.com', 'Administrador', 1);
```

### 4. Frontend

```bash
npm install
```

Revisa `src/app/core/api.config.ts` y deja `API_DESARROLLO` apuntando a tu API (por defecto `http://localhost/sarlaft-api`). Luego:

```bash
npm start        # equivale a: ng serve
```

Abre **http://localhost:4200** e inicia sesión con el administrador que creaste.

## Roles y permisos

| Acción | Administrador | Gestor |
|---|:---:|:---:|
| Ver dashboard, declarantes, dependencias y formularios | ✅ | ✅ |
| Crear y editar declarantes | ✅ | ✅ |
| Crear formularios (transacciones, ausencias, ROS) | ✅ | ✅ |
| Editar formularios ya aprobados o rechazados | ✅ | ❌ (solo mientras estén *Pendiente*) |
| Eliminar registros | ✅ | ❌ |
| Aprobar o rechazar formularios | ✅ | ❌ |
| Gestionar dependencias y usuarios | ✅ | ❌ |
| Ver el historial de auditoría | ✅ | ❌ |

Las reglas se definen en `sarlaft-api/src/recursos.php`.

## API

Todas las rutas (excepto el inicio de sesión) requieren el encabezado `Authorization: Bearer <token>`. Las respuestas tienen la forma `{ "success": true, "data": ... }` o `{ "success": false, "message": "...", "errors": { "campo": "..." } }`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Inicia sesión: `{ usuario, password }` → `{ token, usuario }` |
| `GET` | `/auth/me` | Usuario de la sesión |
| `GET` | `/dashboard` | Indicadores, actividad reciente y resumen |
| `GET` `POST` | `/declarantes` | Listar y crear |
| `GET` `PUT` `DELETE` | `/declarantes/{id}` | Detalle, actualizar y eliminar |
| `GET` `POST` | `/dependencias` · `/usuarios` | Listar y crear |
| `GET` `PUT` `DELETE` | `/dependencias/{id}` · `/usuarios/{id}` | Detalle, actualizar y eliminar |
| `GET` `POST` | `/transacciones` · `/ausencias` · `/reportes-ros` | Listar y crear |
| `GET` `PUT` `DELETE` | `/transacciones/{id}` · `/ausencias/{id}` · `/reportes-ros/{id}` | Detalle, actualizar y eliminar |
| `PATCH` | `/transacciones/{id}/revision` (igual en `ausencias` y `reportes-ros`) | Aprobar o rechazar: `{ estado, observacion }` |
| `GET` | `/historial` | Bitácora de auditoría |

**Filtros** en las listas: `?q=texto` · `?estado=Pendiente` · `?id_declarante=1` · `?desde=2026-10-01&hasta=2026-10-31` · `?limit=50&offset=0`.

Los consecutivos se generan solos: `TE-0001` (transacciones), `AT-0001` (ausencias) y `ROS-0001` (reportes ROS).

## Despliegue en un hosting (cPanel)

### API

1. En cPanel → **Bases de datos MySQL**: crea la base y un usuario con privilegios `SELECT`, `INSERT`, `UPDATE` y `DELETE`.
2. Importa `database/sarlaft_esquema.sql` desde phpMyAdmin.
3. Sube la carpeta `sarlaft-api` a `public_html/` (activa «Mostrar archivos ocultos» para no perder el `.htaccess`).
4. Crea `config.php` en el servidor a partir de `config.example.php` con el usuario y la clave de la base, un `jwt.secret` nuevo y, en `cors.origenes`, la dirección donde publiques Angular.
5. Selecciona PHP 8.1+ con las extensiones `pdo_mysql` y `mbstring`, y usa **HTTPS**.

### Frontend

1. En `src/app/core/api.config.ts`, cambia `API_PRODUCCION` por la URL real de tu API.
2. El proyecto se generó con SSR. Para un hosting compartido sin Node, publícalo como sitio estático: en `angular.json` (opciones de `build`) elimina `server`, `outputMode` y `ssr`.
3. Compila:
   ```bash
   ng build
   ```
4. Sube el contenido de `dist/sarlatf/browser/` a `public_html/` junto con este `.htaccess`, necesario para que funcionen los enlaces directos (por ejemplo `/declarantes`):
   ```apache
   RewriteEngine On
   RewriteRule ^index\.html$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```
   Si lo publicas en una subcarpeta, compila con `ng build --base-href /subcarpeta/`.

## Seguridad

- `sarlaft-api/config.php` contiene las claves y está en el `.gitignore`. **Nunca lo subas.** Si por error se publicó, cambia de inmediato la clave de la base y el `jwt.secret`.
- Las contraseñas se guardan con hash (bcrypt). Las contraseñas antiguas en texto plano se convierten a hash en el primer inicio de sesión.
- Todas las consultas usan sentencias preparadas (PDO) y los datos de entrada se validan en el servidor.
- Cada creación, cambio, eliminación, revisión e inicio de sesión queda en la tabla `historial` con usuario e IP.
- La sesión se guarda en `sessionStorage` y se cierra al cerrar la pestaña. El token vence a las 8 horas (configurable en `config.php`).
- Usa HTTPS en producción y una clave de administrador propia y robusta.

## Hoja de ruta

- [ ] Pantallas de transacciones en efectivo (lista, formulario y revisión)
- [ ] Pantallas de ausencia de transacciones y reportes ROS
- [ ] Pantallas de usuarios, dependencias e historial
- [ ] Detalle de declarante
- [ ] Subida y generación de archivos PDF
- [ ] Paginación en las listas
- [ ] Pruebas automatizadas

## Licencia y autoría

 «Uso interno. Todos los derechos reservados.» y los datos de autoría.
