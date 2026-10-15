# lawyer-clone

Clon moderno (backend **Fastify + Prisma + PostgreSQL**, frontend **Next.js/React**) de **LawyerTools**, un sistema de gestión legal/cobranzas originalmente en SQL Server. El objetivo es reproducir el esquema, los datos núcleo y parte de la interfaz sobre un stack actual.

> Este repositorio contiene **solo código**. Los datos migrados desde la base original (personas, gestiones, etc.) **no** se incluyen por ser información confidencial de un cliente.

## Arquitectura

```
apps/api      API REST (Fastify 5 + Prisma 6 + PostgreSQL)
apps/web      Frontend (Next.js 15 + React 19, estilo escritorio)
db-export/    Artefactos de migración (esquema, DDL, metadatos)
tools/        Scripts PowerShell de extracción / carga
```

- **API** (`:8080`): Prisma sobre PostgreSQL, rutas `/api/*`.
- **Web** (`:3000`): Next.js; reescribe `/api/:path*` → `http://localhost:8080/api/:path*`.

## Requisitos

- Node.js 20+ (probado con 24)
- PostgreSQL 16+
- npm 10+

## Puesta en marcha

```bash
# 1. Dependencias (monorepo con workspaces)
npm install

# 2. Configurar la API
cp apps/api/.env.example apps/api/.env   # ajustar DATABASE_URL

# 3. Preparar el cliente Prisma
npm --workspace api run prisma:generate

# 4. Desarrollo
npm run dev:api     # API en http://localhost:8080
npm run dev:web     # Web en http://localhost:3000
```

Verificación de tipos:

```bash
npm run typecheck
```

## Endpoints principales

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/health` | Estado del servicio |
| GET | `/api/tables/count` | Cantidad de tablas |
| GET | `/api/personas?q=&page=&pageSize=` | Listado/búsqueda de personas |
| GET | `/api/personas/:ori/:cod` | Detalle: teléfonos, domicilios, correos y gestiones |
| GET | `/api/gestiones?q=&page=&pageSize=` | Listado/búsqueda de gestiones |
| GET | `/api/gestiones/:ori/:cod` | Detalle: deudores, acreedores, abogados, agenda, historial |
| GET | `/api/meta/forms` | Definiciones de formularios (`ListForm`) |
| GET | `/api/meta/forms/:ori/:codigo/spec` | Especificación de un formulario (columnas y bandas) |
| GET | `/api/data/tables` | Explorador genérico: tablas disponibles |
| GET | `/api/data/:table?q=&page=&pageSize=` | Filas de cualquier tabla (introspección en runtime) |
| GET | `/api/data/:table/row?<pk>=...` | Fila por clave primaria |

## Migración de datos

El esquema original (SQL Server, `LawyerTools50`) se migró a PostgreSQL. En `db-export/`:

- `schema/` — inventario, columnas/claves y código (procedimientos/triggers) del esquema original.
- `pg/01_ddl.sql` — DDL de PostgreSQL (todas las tablas).
- `pg/core.txt` — lista de tablas migradas.

Los scripts de `tools/` (PowerShell) extraen y cargan los datos. Requieren credenciales por variables de entorno o un archivo local `tools/creds.local.ps1` (no versionado):

```
LT_SERVER=<host,puerto>   LT_USER=<usuario>   LT_DOMAIN=<dominio>   LT_PASS=<clave>
```

## Licencia

Sin licencia definida.
