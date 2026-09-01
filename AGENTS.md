# Tierra Mate Shop

## Objetivo

Construir una tienda web de mates, bombillas, accesorios y sets. El catálogo es público. El dueño y sus empleados administran productos desde un panel privado. La primera versión finaliza la compra creando una reserva y abriendo WhatsApp con el pedido preparado.

## Estado actual

- El repositorio es un monorepo npm con `apps/api` y `apps/web`.
- `apps/api` contiene una API Node.js + Express 5 con módulos ES.
- `database/migrations/001_initial_schema.sql` contiene el esquema inicial para PostgreSQL alojado en Supabase.
- Están implementados autenticación administrativa y CRUD de categorías, productos, variantes, imágenes, personalizaciones y ajustes manuales de stock.
- Estan implementados la carga real a Supabase Storage, la cancelacion administrativa, el vencimiento automatico cada minuto mediante Supabase Cron (con vencimiento manual como respaldo), la confirmacion administrativa de ventas y el seguimiento administrativo `confirmed -> preparing -> completed`.
- `apps/web` contiene la interfaz publica en React: inicio, catalogo, filtros, detalle interactivo, carrito persistente y compra por WhatsApp. Tambien contiene `/admin`: login, rutas protegidas y gestion de categorias, productos, variantes, precios, stock, imagenes, personalizaciones y pedidos.
- No presentar algo como terminado solamente porque su tabla exista.
- Estan implementadas las consultas administrativas paginadas y de detalle de pedidos.
- Están implementadas la configuración pública y administrativa de la tienda, y la gestión de usuarios administrativos desde `/admin/configuracion` y `/admin/usuarios`.
- Cada petición administrativa comprueba que la cuenta del JWT exista, continúe activa y conserve el mismo email. Todos los administradores mantienen el mismo acceso.
- Está implementado el módulo administrativo de inventario de solo consulta en `/admin/inventario`, con historial paginado y alertas de stock bajo.

## Arquitectura y estructura

Nota de estado: esta implementado `POST /api/orders` para crear pedidos publicos
con reserva temporal y enlace de WhatsApp. Tambien estan implementados
`PATCH /api/orders/:id/cancel`, `POST /api/orders/expire` y
`PATCH /api/orders/:id/confirm` como operaciones administrativas. Tambien esta
implementado `PATCH /api/orders/:id/status` para avanzar pedidos confirmados a
`preparing` y pedidos en preparacion a `completed`. Siguen
La carga de imagenes a Supabase Storage y el frontend publico React ya estan
implementados. El panel administrador ya permite iniciar sesion y gestionar
categorias, productos, variantes, precios, stock, imagenes y personalizaciones.
El carrito, la compra por WhatsApp y el modulo administrativo de pedidos estan implementados.

Estan implementados `GET /api/orders` y `GET /api/orders/:id` como consultas
administrativas protegidas con JWT Bearer.

- Mantener un solo repositorio con `apps/api` y `apps/web`.
- Frontend publico: React + Vite en `apps/web`, conectado solamente a la API mediante `VITE_API_URL`.
- Backend: route/controller -> service -> repository -> PostgreSQL.
- Validar entradas HTTP con Zod en `apps/api/src/schemas`.
- Usar consultas parametrizadas con `pg`; nunca concatenar datos del usuario en SQL.
- Encapsular operaciones con múltiples escrituras en transacciones.
- Guardar cambios de esquema como nuevas migraciones SQL; no editar una migración que ya haya sido ejecutada en Supabase.

## Reglas del negocio

- Los compradores navegan y arman el carrito sin iniciar sesión.
- El login existe únicamente para `/admin` y para operaciones administrativas.
- Todos los administradores tienen el mismo nivel de acceso. No crear una tabla de roles ni permisos sin una nueva decisión del usuario. Cada persona conserva su propia cuenta para auditoría.
- Cada variante tiene precio y stock separados. No guardar el stock únicamente en el producto principal.
- Un producto puede ofrecer opciones de personalización, valores seleccionables, precio adicional y una nota del cliente.
- Una variante puede repetirse en lineas separadas cuando sus personalizaciones difieren; configuraciones identicas se combinan en el carrito.
- Antes de enviar el carrito, pedir nombre, teléfono, localidad y dirección.
- Crear una reserva durante 30 minutos justo antes de abrir WhatsApp.
- Una reserva reduce el stock disponible, pero no el stock físico. Al confirmar el pedido se descuenta el stock físico y se registra el movimiento. Al vencer o cancelar una reserva se libera disponibilidad sin sumar stock físico.
- Resolver reservas y confirmaciones con transacciones y bloqueos de filas para impedir sobreventa.
- Validar disponibilidad agrupando todas las cantidades por variante, descontando las reservas vigentes y bloqueando cada variante una sola vez en orden de ID.
- La moneda inicial es ARS.

## Seguridad y configuración

- El navegador nunca se conecta directamente a PostgreSQL.
- La API se conecta a Supabase mediante `DATABASE_URL` en `apps/api/.env`.
- No guardar ni imprimir `.env`, contraseñas, JWT, claves de Supabase o cadenas de conexión completas. Mantener solamente ejemplos sin secretos en Git.
- Las lecturas de catálogo son públicas. Las escrituras actuales usan JWT Bearer y requieren `requireAdmin`.
- Mantener RLS habilitado y sin permisos para `anon`/`authenticated` mientras la arquitectura continúe siendo React -> API -> PostgreSQL.

## Convenciones de la API

- Respuesta exitosa: `{ "data": ... }`; agregar `pagination` cuando corresponda.
- Respuesta de error: `{ "error": { "code": "...", "message": "..." } }`.
- Usar `AppError` para errores esperables y códigos estables en mayúsculas.
- Mantener borrado lógico o desactivación cuando el historial dependa del registro.
- Los slug son identificadores legibles para URLs, en minúsculas y con guiones.

## Comandos

- Instalar: `npm install`
- Ejecutar API: `npm run dev:api`
- Ejecutar frontend: `npm run dev:web`
- Construir frontend: `npm run build:web`
- Probar frontend: `npm run test:web`
- Probar: `npm test`
- Crear administrador inicial: `npm run admin:create --workspace @tierra-mate/api`
- Salud: `GET /api/health`
- Base de datos: `GET /api/health/database`
- Crear pedido publico con reserva: `POST /api/orders`
- Consultar pedidos (administrativo): `GET /api/orders` y `GET /api/orders/:id`
- Cancelar reserva (administrativo): `PATCH /api/orders/:id/cancel`
- Confirmar venta reservada (administrativo): `PATCH /api/orders/:id/confirm`
- Avanzar estado de pedido (administrativo): `PATCH /api/orders/:id/status`
- Vencer reservas terminadas (administrativo): `POST /api/orders/expire`
- Automatizar vencimientos: `database/migrations/002_schedule_order_expiration.sql`
- Configuración pública: `GET /api/store-settings`
- Actualizar configuración (administrativo): `PATCH /api/store-settings`
- Usuarios administrativos: `GET/POST /api/admin-users`, `PATCH /api/admin-users/:id/status` y `PATCH /api/admin-users/:id/password`
- Historial de inventario (administrativo): `GET /api/inventory/movements`
- Alertas de stock bajo (administrativo): `GET /api/inventory/low-stock`

La configuración pública se carga una sola vez en React y se usa para el nombre, la moneda y el enlace válido de WhatsApp; si falla, el catálogo conserva los valores predeterminados. La duración configurada afecta únicamente reservas nuevas. No existe registro público ni roles: las cuentas se crean activas, se desactivan sin borrado físico y no se permite desactivar la cuenta propia ni el último administrador activo. La prueba desde túneles o celulares continúa siendo una verificación manual separada.

El historial de inventario admite filtros por tipo, producto, variante, administrador y pedido, con paginación por cursor. Las alertas distinguen stock físico, unidades reservadas vigentes y disponibilidad. Este módulo no modifica stock, pedidos ni movimientos. El dashboard con estadísticas generales continúa pendiente.

## Criterio de finalización

- Inspeccionar primero los archivos relacionados y preservar cambios ajenos.
- Implementar el cambio en todas las capas necesarias.
- Agregar o actualizar pruebas para reglas y errores relevantes.
- Ejecutar `npm test` después de modificar JavaScript del backend.
- Explicar qué se cambió, cómo se verificó y qué parte continúa pendiente.
