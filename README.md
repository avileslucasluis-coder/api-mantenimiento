# API de mantenimiento e inventarios

API NestJS con Prisma y PostgreSQL. Gestiona categorías, productos, equipos, órdenes y movimientos. La app Flutter está en `C:\app-mantenimiento`.

## Instalación local

1. Ejecuta `npm ci`.
2. Copia `.env.example` a `.env` solo si no existe. Configura contraseña de PostgreSQL, DATABASE_URL, JWT_SECRET (32 caracteres o más), ADMIN_EMAIL y ADMIN_PASSWORD (10 caracteres o más).
3. Ejecuta `docker compose up -d`. La base dedicada escucha en localhost:5544.
4. Ejecuta `npm run db:generate` y `npm run db:migrate`.
5. Ejecuta `npm run build` y `npm run start:prod`.

Recomendado: Node 24.15 o superior. Prisma CLI y cliente usan la versión estable 7.10.1. El .env de este equipo ya contiene credenciales locales generadas; no lo publiques ni lo sobrescribas.

## Endpoints

| Ruta | Operaciones |
|---|---|
| /health | GET público |
| /auth/register | POST público; crea BODEGUERO |
| /auth/login | POST público; devuelve accessToken y user |
| /auth/me | GET autenticado |
| /categorias, /productos, /equipos | GET lista; POST administrador |
| /categorias/:id, /productos/:id, /equipos/:id | GET; PATCH y DELETE administrador |
| /mantenimientos | GET; POST administrador |
| /mantenimientos/:id | GET con repuestos utilizados |
| /mantenimientos/:id/cerrar | PATCH administrador |
| /movimientos | GET; POST ambos roles |
| /movimientos/:id | GET |
| /docs | Swagger |

Envía `Authorization: Bearer <token>`. Las listas aceptan page y limit (máximo 100) y devuelven `{data, meta: {total, page, limit, totalPages}}`. Productos admite search y categoriaId; equipos search; órdenes search, equipoId, estado y tipo; movimientos search (motivo), productoId, mantenimientoId y tipo.

## Flujo de uso

Crea categoría, producto y equipo como ADMIN. Registra una ENTRADA para dar stock al producto. Abre un mantenimiento para el equipo. Registra una SALIDA con productoId, cantidad y mantenimientoId. El stock y el movimiento se guardan en una transacción serializable. Cierra la orden al finalizar.

El stock no se acepta en el DTO de producto. No se permiten cantidades negativas, salidas por encima del stock ni consumos asociados a órdenes cerradas. El estado del equipo se obtiene de sus órdenes abiertas. No se eliminan movimientos ni órdenes históricas.

## Seguridad y configuración

Las contraseñas se almacenan con scrypt y sal aleatoria; los tokens JWT expiran a las 8 horas. Guards globales comprueban autenticación y rol consultando el usuario actual. El registro no acepta un rol enviado por el cliente. Hay validación de DTOs, Helmet, límite de peticiones y CORS restringido a CORS_ORIGINS.

La autenticación usa bearer explícito, no cookies de sesión. Los errores Prisma de duplicados o relaciones se traducen a 409; registros inexistentes a 404. El administrador inicial se crea por email al arrancar y no se reemplaza si ya existe.

Para Supabase configura DATABASE_URL y, si corresponde, DIRECT_URL para migraciones. La aplicación usa el adaptador PostgreSQL. El despliegue, RLS, políticas del proveedor y firma/publicación de entregables no se han configurado todavía.

## Pruebas

```powershell
npm run build
npm run lint
npm test
npm run test:e2e
# Con la API local encendida:
npm run test:integration
```

La suite integration contiene ocho escenarios reales e incluye salidas concurrentes. Crea registros con identificadores únicos y conserva su historial. Usa una base local de desarrollo, nunca producción. TEST_API_URL permite cambiar el servidor de pruebas.

## Carpetas

- src/auth: registro, login, hashes y guards.
- src/database: ciclo de vida de Prisma.
- src/gestion: DTOs, endpoints y reglas transaccionales.
- src/common: traducción de errores de persistencia.
- prisma: esquema y migración inicial.
- test: verificaciones HTTP e integración.

El README de la app explica los roles y el recorrido completo de usuario.

## Verificación automática

El flujo `.github/workflows/ci.yml` prepara PostgreSQL 17 aislado, genera Prisma, aplica migraciones, compila, revisa lint y ejecuta las pruebas unitarias, e2e e integración. Las credenciales se generan para esa ejecución. No utiliza la base de producción. El flujo aún no se ha ejecutado en GitHub.

La suite unitaria contiene 11 pruebas; diez comprueban hashing, sal aleatoria, contraseñas incorrectas, normalización del correo, registro duplicado y datos públicos de sesión.
