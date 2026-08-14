# Tierra Mate Shop

Monorepo de la tienda Tierra Mate Shop.

## Estructura

```text
apps/
  api/        API Node.js + Express
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

### Crear el primer administrador

Completá en `apps/api/.env` las variables `ADMIN_BOOTSTRAP_NAME`,
`ADMIN_BOOTSTRAP_EMAIL` y `ADMIN_BOOTSTRAP_PASSWORD`. Después ejecutá:

```bash
npm run admin:create --workspace @tierra-mate/api
```

La contraseña se guarda únicamente como hash bcrypt. Después de crear la cuenta,
quitá `ADMIN_BOOTSTRAP_PASSWORD` del archivo `.env`.

### Rutas principales

- `POST /api/auth/login`
- `POST /api/orders`
- `GET /api/orders` (administrativa, con filtros y paginacion por cursor)
- `GET /api/orders/:id` (administrativa, incluye items y personalizaciones)
- `PATCH /api/orders/:id/cancel` (administrativa, cancela una reserva activa)
- `POST /api/orders/expire` (administrativa, vence reservas cuyo plazo termino)
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

Las cancelaciones y el vencimiento cambian solamente el estado del pedido: no
modifican el stock fisico ni crean movimientos de inventario. Por ahora el
vencimiento se ejecuta manualmente mediante el endpoint administrativo.

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
