# Tierra Mate Shop

## Objetivo

Construir una tienda web de mates, bombillas, accesorios y sets. El catálogo es público. El dueño y sus empleados administran productos desde un panel privado. La primera versión finaliza la compra creando una reserva y abriendo WhatsApp con el pedido preparado.

## Estado actual

- El repositorio es un monorepo npm.
- `apps/api` contiene una API Node.js + Express 5 con módulos ES.
- `database/migrations/001_initial_schema.sql` contiene el esquema inicial para PostgreSQL alojado en Supabase.
- Están implementados autenticación administrativa y CRUD de categorías, productos, variantes, imágenes, personalizaciones y ajustes manuales de stock.
- Todavía no están implementados los endpoints de pedidos, reservas, vencimiento, confirmación de ventas, carga real a Supabase Storage ni el frontend React.
- No presentar algo como terminado solamente porque su tabla exista.

## Arquitectura y estructura

- Mantener un solo repositorio con `apps/api` y, cuando se cree, `apps/web`.
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
- Antes de enviar el carrito, pedir nombre, teléfono, localidad y dirección.
- Crear una reserva durante 30 minutos justo antes de abrir WhatsApp.
- Una reserva reduce el stock disponible, pero no el stock físico. Al confirmar el pedido se descuenta el stock físico y se registra el movimiento. Al vencer o cancelar una reserva se libera disponibilidad sin sumar stock físico.
- Resolver reservas y confirmaciones con transacciones y bloqueos de filas para impedir sobreventa.
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
- Probar: `npm test`
- Crear administrador inicial: `npm run admin:create --workspace @tierra-mate/api`
- Salud: `GET /api/health`
- Base de datos: `GET /api/health/database`

## Criterio de finalización

- Inspeccionar primero los archivos relacionados y preservar cambios ajenos.
- Implementar el cambio en todas las capas necesarias.
- Agregar o actualizar pruebas para reglas y errores relevantes.
- Ejecutar `npm test` después de modificar JavaScript del backend.
- Explicar qué se cambió, cómo se verificó y qué parte continúa pendiente.
