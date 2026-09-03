# Tierra Mate Shop

Monorepo de la tienda Tierra Mate Shop.

## Estructura

```text
apps/
  api/        API Node.js + Express
  web/        Tienda publica React + Vite
database/
  migrations/ Migraciones PostgreSQL/Supabase
```

## Backend

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run dev:api
```

La API usa la estructura `controller -> service -> repository -> PostgreSQL`.

## Frontend publico

La interfaz publica incluye inicio, catalogo con filtro por categoria y
paginacion, detalle interactivo, carrito persistente y compra mediante una
reserva con apertura de WhatsApp. Consume solamente la API; no se conecta
directamente a PostgreSQL ni utiliza claves secretas de Supabase.

```bash
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

Variable del frontend:

```env
VITE_API_URL=http://localhost:3000/api
```

Para trabajar localmente, ejecutar en terminales separadas:

```bash
npm run dev:api
npm run dev:web
```

Verificacion del frontend:

```bash
npm run test:web
npm run build:web
```

El frontend incluye un panel administrador en `/admin`: login, rutas protegidas,
gestion de categorias y productos, variantes, precios, ajustes de stock, imagenes,
personalizaciones y pedidos con detalle, confirmacion, cancelacion y seguimiento
de estados.

### Crear el primer administrador

Completá en `apps/api/.env` las variables `ADMIN_BOOTSTRAP_NAME`,
`ADMIN_BOOTSTRAP_EMAIL` y `ADMIN_BOOTSTRAP_PASSWORD`. Después ejecutá:

```bash
npm run admin:create --workspace @tierra-mate/api
```

La contraseña se guarda únicamente como hash bcrypt. Después de crear la cuenta,
quitá `ADMIN_BOOTSTRAP_PASSWORD` del archivo `.env`.

### Restablecer la contraseña de un administrador

Si la cuenta ya existe, completá temporalmente estas variables en `apps/api/.env`:

```env
ADMIN_RESET_EMAIL=admin@ejemplo.com
ADMIN_RESET_PASSWORD=una-contraseña-nueva-y-segura
```

Ejecutá desde la raíz:

```bash
npm run admin:reset-password
```

Después eliminá `ADMIN_RESET_PASSWORD` del archivo `.env`. La contraseña nunca
se guarda en texto plano en PostgreSQL ni se imprime durante el proceso.

### Rutas principales

- `POST /api/auth/login`
- `POST /api/orders`
- `GET /api/orders` (administrativa, con filtros y paginacion por cursor)
- `GET /api/orders/:id` (administrativa, incluye items y personalizaciones)
- `PATCH /api/orders/:id/cancel` (administrativa, cancela una reserva activa)
- `PATCH /api/orders/:id/confirm` (administrativa, confirma la venta reservada)
- `PATCH /api/orders/:id/status` (administrativa, avanza `confirmed -> preparing -> completed`)
- `POST /api/orders/expire` (administrativa, vence reservas cuyo plazo termino)
- `GET /api/dashboard` (administrativa, resumen de pedidos, ventas e inventario)
- `GET|POST /api/categories`
- `GET|PATCH|DELETE /api/categories/:id`
- `GET|POST /api/products`
- `GET|PATCH|DELETE /api/products/:id`
- `POST /api/products/:productId/variants`
- `PATCH|DELETE /api/products/:productId/variants/:id`
- `PATCH /api/products/:productId/variants/:id/stock`
- `POST /api/products/:productId/images`
- `PATCH|DELETE /api/products/:productId/images/:id`
- `POST /api/products/:productId/personalizations`
- `PATCH|DELETE /api/products/:productId/personalizations/:id`

Las lecturas del catalogo son publicas. Las escrituras administrativas y las
consultas de pedidos requieren `Authorization: Bearer <token>`.

### Pedidos publicos

`POST /api/orders` crea un pedido con estado `reserved`, reserva disponibilidad
durante los minutos configurados en `store_settings` y devuelve el mensaje/URL
de WhatsApp. La reserva no modifica `stock_quantity`; el stock fisico se
descuenta recien al confirmar la venta.

Una variante puede repetirse en lineas independientes cuando cambian sus
personalizaciones. El carrito combina solamente configuraciones identicas. Al
crear la reserva, la API agrupa todas las cantidades por `variant_id`, bloquea
cada variante una sola vez y compara el total solicitado con el stock fisico
menos las reservas vigentes. Despues guarda y muestra cada configuracion como
una linea separada, incluido el mensaje de WhatsApp.

Las cancelaciones y el vencimiento cambian solamente el estado del pedido: no
modifican el stock fisico ni crean movimientos de inventario. La migracion
`002_schedule_order_expiration.sql` programa el vencimiento automatico cada
minuto mediante Supabase Cron; el endpoint administrativo queda disponible
como respaldo manual.

La confirmacion administrativa obtiene los items guardados, bloquea las
variantes en orden, descuenta el stock fisico y crea un movimiento
`confirmed_sale` por variante. Repetir la confirmacion es idempotente.

El seguimiento administrativo permite avanzar un pedido confirmado a
`preparing` y luego a `completed`. Estas transiciones no modifican stock fisico,
no crean movimientos de inventario y preservan `confirmed_at`; al completar se
guarda `completed_at`.

### Dashboard administrativo

El resumen de `/admin` consume `GET /api/dashboard`, un endpoint protegido y exclusivamente de consulta. Muestra reservas activas, estados actuales, ventas confirmadas de hoy y del mes, inventario, los ocho pedidos recientes y hasta cinco productos más vendidos.

Una venta confirmada es un pedido cuyo estado actual es `confirmed`, `preparing` o `completed`; se atribuye al día y mes de `confirmed_at`, nunca de `created_at`. Los completados del día se atribuyen mediante `completed_at`. Todos los límites usan `America/Argentina/Buenos_Aires` aunque el servidor funcione en UTC. Los valores representan pedidos confirmados y no necesariamente pagos cobrados.

En inventario se consideran solamente variantes activas de productos activos no eliminados. Stock bajo incluye el límite exacto y puede incluir también una variante sin stock.

Ejemplo minimo:

```json
{
  "customer": {
    "name": "Ana Gomez",
    "phone": "1122334455",
    "locality": "Moron",
    "address": "Av. Siempre Viva 123"
  },
  "items": [
    {
      "variant_id": 1,
      "quantity": 2,
      "personalizations": [
        {
          "option_id": 1,
          "selected_value": "iniciales",
          "customer_note": "AG"
        }
      ]
    }
  ]
}
```
# Configuración y usuarios administrativos

La configuración pública se consulta con `GET /api/store-settings` y alimenta una única carga centralizada del frontend para nombre, moneda, duración de reserva y WhatsApp. `PATCH /api/store-settings` requiere JWT administrativo; los cambios de duración se aplican solamente a reservas nuevas.

La gestión del equipo está disponible en `/admin/usuarios` mediante `GET /api/admin-users`, `POST /api/admin-users`, `PATCH /api/admin-users/:id/status` y `PATCH /api/admin-users/:id/password`. No existe registro público, las contraseñas se guardan con bcrypt, no se eliminan cuentas y no se permite desactivar la cuenta propia ni el último administrador activo. Todos los administradores conservan el mismo acceso. Cada petición protegida vuelve a comprobar que la cuenta exista, siga activa y coincida con el email del JWT.

Las pantallas protegidas `/admin/configuracion` y `/admin/usuarios` permiten operar estas funciones. La comprobación desde un celular o mediante un túnel continúa siendo una verificación manual separada de las pruebas automatizadas.

## Inventario administrativo

La ruta protegida `/admin/inventario` consulta alertas de stock bajo e historial físico mediante `GET /api/inventory/low-stock` y `GET /api/inventory/movements`. El historial se pagina por cursor descendente y permite filtrar por tipo de movimiento, producto, variante, administrador y pedido.

Las alertas muestran por separado stock físico, unidades comprometidas por reservas vigentes y stock disponible. Productos o variantes inactivos no generan alertas, aunque sus movimientos históricos siguen visibles. El módulo es exclusivamente de consulta: no cambia stock, pedidos, reservas ni movimientos.
