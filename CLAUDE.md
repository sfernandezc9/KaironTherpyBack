# KaironTherapy — Backend API

Sistema de gestión clínica multi-sucursal. Node.js + Express + MySQL.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Base de datos | MySQL (driver: `mysql2/promise`) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Dev | nodemon |

```
npm run dev   → nodemon src/app.js   (puerto 3000)
npm start     → node src/app.js
npm run seed  → scripts/seed-usuarios.js
```

Variables de entorno requeridas (`.env`):
```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET, JWT_EXPIRES_IN   (ej: 8h)
PORT
```

---

## Estructura

```
src/
├── app.js                        ← entry point, monta todas las rutas
├── config/
│   └── db.js                     ← pool mysql2/promise
├── middleware/
│   ├── authenticate.js           ← verifica JWT → puebla req.user
│   ├── authorize.js              ← authorize('administrador') → 403 si rol no coincide
│   └── errorHandler.js           ← maneja ER_DUP_ENTRY, ER_NO_REFERENCED_ROW_2, etc.
├── controllers/
│   ├── auth.controller.js
│   ├── empresa.controller.js
│   ├── sucursal.controller.js
│   ├── persona.controller.js
│   ├── paciente.controller.js
│   ├── terapeuta.controller.js
│   ├── insumo.controller.js
│   ├── stock.controller.js
│   ├── fichaClinica.controller.js
│   ├── historial.controller.js
│   ├── sesion.controller.js
│   └── informe.controller.js
└── routes/
    └── (mismo nombre, sufijo .routes.js)

schema_mysql.sql   ← DDL completo para MySQL
```

---

## Base de datos

### Tablas (14 total)

| Tabla | Descripción |
|---|---|
| `empresa` | Organización raíz |
| `sucursal` | Branches de la empresa |
| `persona` | Tabla base de datos personales (RUT único) |
| `paciente` | Subtipo de persona — 1:1 con persona |
| `terapeuta` | Subtipo de persona — 1:1 con persona |
| `terapeuta_sucursal` | M:N terapeuta ↔ sucursal, con fecha_inicio/fecha_fin |
| `insumo` | Catálogo de insumos |
| `stock_insumo` | Cantidad de insumo por sucursal |
| `ficha_clinica` | Ficha clínica — 1:1 con paciente (UNIQUE id_paciente) |
| `sesion` | Atención: referencia id_ficha (NO id_paciente directo) |
| `sesion_insumo` | Insumos usados en sesión — descuenta stock en transacción |
| `historial_atencion` | Audit log de cambios a ficha_clinica (auto-generado) |
| `informe` | Informes con FK opcionales a cualquier entidad |
| `usuario` | Credenciales auth — 1:1 con persona, tiene `rol` |

### Tabla `usuario` (no en schema original, añadida al implementar auth)

```sql
CREATE TABLE usuario (
    id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
    id_persona     INT NOT NULL UNIQUE REFERENCES persona(id_persona),
    email          VARCHAR(100) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    rol            ENUM('administrador','terapeuta') NOT NULL,
    activo         BOOLEAN DEFAULT TRUE,
    ultimo_login   TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Relaciones clave

```
empresa → sucursal (1:N)
persona → paciente (1:1)
persona → terapeuta (1:1)
persona → usuario (1:1)
terapeuta ↔ sucursal (M:N via terapeuta_sucursal)
paciente → ficha_clinica (1:1, UNIQUE)
ficha_clinica → sesion (1:N)   ← sesion usa id_ficha, NUNCA id_paciente directo
sesion → sesion_insumo (1:N)
ficha_clinica → historial_atencion (1:N, auto-generado)
stock_insumo → sesion_insumo (N:1)
```

---

## Autenticación y Roles

### Flujo

```
POST /api/auth/login { email, password }
→ { token, usuario: { id_usuario, email, rol, nombres, apellidos } }

Authorization: Bearer <token>   ← header en todas las rutas protegidas
```

### Payload JWT (`req.user`)

```js
{
  id_usuario:  number,
  id_persona:  number,
  id_terapeuta: number | null,   // null si rol = administrador
  rol:          'administrador' | 'terapeuta',
  email:        string
}
```

### Roles

| Rol | Acceso |
|---|---|
| `administrador` | Todo — CRUD completo en todas las entidades |
| `terapeuta` | Lee pacientes/fichas/historial. Gestiona solo sus propias sesiones. No ve stock/insumos/terapeutas/sucursales/empresa/informes |

### Endpoints auth

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | authenticate |
| GET | `/api/auth/usuarios` | admin |
| POST | `/api/auth/usuarios` | admin |
| PUT | `/api/auth/usuarios/:id/password` | authenticate (terapeuta solo la suya) |
| PUT | `/api/auth/usuarios/:id/desactivar` | admin |

---

## Permisos por Ruta

### Leyenda
- **admin** = `[authenticate, authorize('administrador')]`
- **auth** = `authenticate` (ambos roles)

| Recurso | GET list | GET :id | POST | PUT | DELETE |
|---|---|---|---|---|---|
| `/api/empresas` | admin | admin | admin | admin | admin |
| `/api/sucursales` | admin | admin | admin | admin | admin |
| `/api/personas` | auth | auth | admin | admin | admin |
| `/api/pacientes` | auth | auth | admin | admin | admin |
| `/api/terapeutas` | admin | admin | admin | admin | admin |
| `/api/insumos` | admin | admin | admin | admin | admin |
| `/api/stock` | admin | admin | admin | admin | admin |
| `/api/fichas` | auth | auth | **admin** | auth | — |
| `/api/sesiones` | auth | auth | auth | auth | auth |
| `/api/historial` | auth | auth | — | — | — |
| `/api/informes` | admin | admin | admin | admin | admin |

---

## Lógica de Negocio Importante

### 1. Sesiones — scope automático por rol

`GET /api/sesiones` filtra automáticamente por terapeuta si `req.user.rol === 'terapeuta'`:

```js
const filtroTerapeuta = req.user.rol === 'terapeuta'
  ? req.user.id_terapeuta
  : id_terapeuta;  // query param del admin
```

### 2. Insumos en sesión — transacción con control de stock

`POST /api/sesiones/:id/insumos { id_stock, cantidad_usada }`:
- Verifica `stock_insumo.cantidad >= cantidad_usada` → 400 si insuficiente
- Descuenta stock y registra `sesion_insumo` en una sola transacción

`DELETE /api/sesiones/:id/insumos/:id_uso`:
- Devuelve `cantidad_usada` al stock antes de borrar

### 3. Ficha clínica — auditoría automática

`PUT /api/fichas/:id` requiere `id_terapeuta` en el body.
El controller hace diff campo a campo sobre 6 campos auditables:
`motivo_consulta, antecedentes, alergias, medicamentos, diagnostico_actual, observaciones`
→ Inserta una fila en `historial_atencion` por cada campo que cambió.

### 4. Creación de paciente/terapeuta — transacciones

`POST /api/pacientes` y `POST /api/terapeutas` crean en una transacción:
- Primero inserta en `persona`
- Luego inserta en `paciente` / `terapeuta` usando el `id_persona` obtenido
- Rollback completo si cualquier paso falla

### 5. Stock de sucursal para terapeutas

`GET /api/sesiones/stock-sucursal/:id_sucursal`:
- Terapeuta: verifica que tenga asignación activa en esa sucursal (403 si no)
- Retorna solo insumos con `cantidad > 0`
- Admin: acceso sin restricción de sucursal

### 6. Ficha clínica — flujo obligatorio

```
Crear paciente → Crear ficha (POST /fichas { id_paciente }) → Crear sesión ({ id_ficha })
```

Sin ficha no se pueden crear sesiones. La ficha se obtiene con `GET /pacientes/:id/ficha`.

---

## Endpoints con Sub-rutas Destacadas

```
GET  /api/empresas/:id/sucursales
GET  /api/sucursales/:id/terapeutas      (activos, fecha_fin IS NULL)
GET  /api/sucursales/:id/stock           (con flag stock_bajo)
GET  /api/pacientes/:id/ficha
GET  /api/pacientes/:id/sesiones
GET  /api/terapeutas/:id/sucursales
GET  /api/terapeutas/:id/sesiones?desde=&hasta=
POST /api/terapeutas/:id/sucursales      { id_sucursal, fecha_inicio }
PUT  /api/terapeutas/:id/sucursales/:id_sucursal/desasignar  { fecha_fin }
GET  /api/fichas/:id/historial
GET  /api/sesiones/:id/insumos
POST /api/sesiones/:id/insumos           { id_stock, cantidad_usada }
DELETE /api/sesiones/:id/insumos/:id_uso
GET  /api/stock/bajo-minimo
PATCH /api/stock/:id/ajustar             { delta: number }  (+/-)
GET  /api/insumos/:id/stock
GET  /api/sesiones/stock-sucursal/:id_sucursal
GET  /api/historial?id_ficha=&id_terapeuta=&campo=
GET  /api/sesiones?id_sucursal=&id_terapeuta=&desde=&hasta=&estado=
GET  /api/informes?tipo=
GET  /api/auth/me                        → incluye sucursales activas si es terapeuta
```

---

## Manejo de Errores

`src/middleware/errorHandler.js` captura:
- `ER_DUP_ENTRY` → 409
- `ER_NO_REFERENCED_ROW_2` → 400
- `ER_ROW_IS_REFERENCED_2` → 409
- Resto → 500

Controllers devuelven 404 cuando `affectedRows === 0` o array vacío en lookup por ID.

---

## Pendiente / No implementado

- **SQLite para testing local** — se discutió pero no se implementó. DB requiere MySQL real con `.env` configurado.
- Sin paginación en ningún endpoint (todos retornan lista completa).
- Sin validación de esquema en request body (no hay Joi/Zod).
- Sin rate limiting.
- Sin refresh tokens (JWT expira en 8h, sin renovación).
