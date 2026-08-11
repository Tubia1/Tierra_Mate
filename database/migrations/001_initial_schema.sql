-- Tierra Mate Shop - esquema inicial
-- Ejecutar una sola vez desde Supabase > SQL Editor.
--
-- Arquitectura de acceso:
--   React -> API Node/Express -> PostgreSQL (Supabase)
--
-- Las tablas NO se exponen directamente al navegador. Por eso se habilita
-- Row Level Security y se revocan los permisos de anon/authenticated.

begin;

-- ---------------------------------------------------------------------------
-- Seguridad por defecto para futuros objetos creados por postgres en public
-- ---------------------------------------------------------------------------

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- Las funciones internas viven fuera del esquema expuesto por la Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Administradores
-- Todos poseen el mismo nivel de acceso. Cada persona conserva una cuenta
-- separada para poder auditar quién realizó cada movimiento.
-- ---------------------------------------------------------------------------

create table public.admin_users (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  email text not null check (btrim(email) <> ''),
  password_hash text not null check (btrim(password_hash) <> ''),
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index admin_users_email_unique_idx
  on public.admin_users (lower(email));

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Categorías
-- ---------------------------------------------------------------------------

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_order integer not null default 0 check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Productos
-- Un producto se desactiva o se elimina de forma lógica con deleted_at.
-- ---------------------------------------------------------------------------

create table public.products (
  id bigint generated always as identity primary key,
  category_id bigint not null
    references public.categories(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  materials text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index products_active_slug_unique_idx
  on public.products (slug)
  where deleted_at is null;

create index products_category_id_idx
  on public.products (category_id);

create index products_category_active_idx
  on public.products (category_id, created_at desc)
  where active = true and deleted_at is null;

create index products_featured_idx
  on public.products (created_at desc)
  where featured = true and active = true and deleted_at is null;

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Imágenes de productos
-- storage_path guarda la ruta del archivo dentro de Supabase Storage.
-- ---------------------------------------------------------------------------

create table public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null
    references public.products(id) on delete cascade,
  storage_path text not null check (btrim(storage_path) <> ''),
  alt_text text,
  is_primary boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx
  on public.product_images (product_id, display_order);

create unique index product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary = true;

-- ---------------------------------------------------------------------------
-- 5. Variantes
-- Cada variante administra su propio precio y stock físico.
-- ---------------------------------------------------------------------------

create table public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null
    references public.products(id) on delete restrict,
  sku text not null unique check (btrim(sku) <> ''),
  name text not null check (btrim(name) <> ''),
  color text,
  finish text,
  price numeric(12, 2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 2
    check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_variants_product_id_idx
  on public.product_variants (product_id);

create index product_variants_product_active_idx
  on public.product_variants (product_id, price)
  where active = true;

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Opciones de personalización
-- choices es un arreglo JSON cuando input_type = 'select'.
-- Ejemplo: [{"value":"iniciales","label":"Iniciales"}]
-- ---------------------------------------------------------------------------

create table public.personalization_options (
  id bigint generated always as identity primary key,
  product_id bigint not null
    references public.products(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  input_type text not null
    check (input_type in ('select', 'text', 'boolean')),
  choices jsonb,
  extra_price numeric(12, 2) not null default 0 check (extra_price >= 0),
  required boolean not null default false,
  allows_note boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personalization_choices_valid check (
    (input_type = 'select' and choices is not null and jsonb_typeof(choices) = 'array')
    or
    (input_type <> 'select' and (choices is null or jsonb_typeof(choices) = 'array'))
  )
);

create index personalization_options_product_id_idx
  on public.personalization_options (product_id);

create index personalization_options_product_active_idx
  on public.personalization_options (product_id, display_order)
  where active = true;

create trigger personalization_options_set_updated_at
before update on public.personalization_options
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Pedidos y reservas
-- El código público se genera automáticamente: TMS-000001, TMS-000002, etc.
-- Una reserva dura inicialmente 30 minutos (configurable en store_settings).
-- ---------------------------------------------------------------------------

create sequence public.order_code_seq as bigint start with 1 increment by 1;

create table public.orders (
  id bigint generated always as identity primary key,
  code text not null unique default
    ('TMS-' || lpad(nextval('public.order_code_seq')::text, 6, '0')),
  customer_name text not null check (btrim(customer_name) <> ''),
  customer_phone text not null check (btrim(customer_phone) <> ''),
  customer_locality text not null check (btrim(customer_locality) <> ''),
  customer_address text not null check (btrim(customer_address) <> ''),
  customer_notes text,
  status text not null default 'reserved'
    check (status in (
      'reserved',
      'confirmed',
      'preparing',
      'completed',
      'cancelled',
      'expired'
    )),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  shipping_cost numeric(12, 2) check (shipping_cost is null or shipping_cost >= 0),
  total numeric(12, 2) not null check (total >= 0),
  reserved_until timestamptz,
  whatsapp_sent_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserved_order_has_expiration check (
    status <> 'reserved' or reserved_until is not null
  ),
  constraint order_total_valid check (
    total = subtotal + coalesce(shipping_cost, 0)
  )
);

alter sequence public.order_code_seq owned by public.orders.code;

create index orders_status_created_at_idx
  on public.orders (status, created_at desc);

create index orders_active_reservations_idx
  on public.orders (reserved_until, id)
  where status = 'reserved';

create index orders_customer_phone_idx
  on public.orders (customer_phone, created_at desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Ítems del pedido
-- Se guardan copias del nombre, SKU y precio para preservar el historial.
-- personalization_total representa el adicional total de la línea completa.
-- ---------------------------------------------------------------------------

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null
    references public.orders(id) on delete cascade,
  product_id bigint not null
    references public.products(id) on delete restrict,
  variant_id bigint not null
    references public.product_variants(id) on delete restrict,
  product_name text not null check (btrim(product_name) <> ''),
  variant_name text not null check (btrim(variant_name) <> ''),
  sku text not null check (btrim(sku) <> ''),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  personalization_total numeric(12, 2) not null default 0
    check (personalization_total >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  constraint order_item_total_valid check (
    line_total = (unit_price * quantity) + personalization_total
  )
);

create index order_items_order_id_idx
  on public.order_items (order_id);

create index order_items_variant_order_idx
  on public.order_items (variant_id, order_id);

create index order_items_product_id_idx
  on public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- 9. Personalizaciones elegidas en cada ítem
-- También se guardan copias para que el historial no cambie si se edita la
-- opción original.
-- ---------------------------------------------------------------------------

create table public.order_item_personalizations (
  id bigint generated always as identity primary key,
  order_item_id bigint not null
    references public.order_items(id) on delete cascade,
  option_id bigint
    references public.personalization_options(id) on delete set null,
  option_name text not null check (btrim(option_name) <> ''),
  selected_value text,
  customer_note text,
  extra_price numeric(12, 2) not null default 0 check (extra_price >= 0),
  created_at timestamptz not null default now()
);

create index order_item_personalizations_item_idx
  on public.order_item_personalizations (order_item_id);

create index order_item_personalizations_option_idx
  on public.order_item_personalizations (option_id)
  where option_id is not null;

-- ---------------------------------------------------------------------------
-- 10. Movimientos de inventario
-- Las reservas NO generan movimientos. El stock físico se descuenta al
-- confirmar el pedido, dentro de una transacción realizada por el backend.
-- ---------------------------------------------------------------------------

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id bigint not null
    references public.product_variants(id) on delete restrict,
  order_id bigint
    references public.orders(id) on delete restrict,
  admin_user_id bigint
    references public.admin_users(id) on delete restrict,
  movement_type text not null
    check (movement_type in (
      'initial_stock',
      'manual_adjustment',
      'confirmed_sale',
      'returned_stock'
    )),
  quantity_change integer not null check (quantity_change <> 0),
  previous_stock integer not null check (previous_stock >= 0),
  new_stock integer not null check (new_stock >= 0),
  note text,
  created_at timestamptz not null default now(),
  constraint inventory_movement_balance_valid check (
    new_stock = previous_stock + quantity_change
  )
);

create index inventory_movements_variant_created_idx
  on public.inventory_movements (variant_id, created_at desc);

create index inventory_movements_order_id_idx
  on public.inventory_movements (order_id)
  where order_id is not null;

create index inventory_movements_admin_user_id_idx
  on public.inventory_movements (admin_user_id)
  where admin_user_id is not null;

-- ---------------------------------------------------------------------------
-- 11. Configuración de la tienda
-- La restricción id = 1 garantiza que exista una sola fila de configuración.
-- ---------------------------------------------------------------------------

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null check (btrim(store_name) <> ''),
  whatsapp_number text,
  reservation_minutes integer not null default 30
    check (reservation_minutes between 1 and 1440),
  currency text not null default 'ARS'
    check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Datos iniciales
-- No se crean administradores aquí porque sus contraseñas deben generarse
-- mediante el backend usando un hash seguro.
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug, display_order)
values
  ('Mates', 'mates', 1),
  ('Bombillas', 'bombillas', 2),
  ('Accesorios', 'accesorios', 3),
  ('Sets', 'sets', 4);

insert into public.store_settings (
  id,
  store_name,
  reservation_minutes,
  currency
)
values (1, 'Tierra Mate Shop', 30, 'ARS');

-- ---------------------------------------------------------------------------
-- Seguridad de la Data API
-- RLS queda habilitado sin políticas públicas: el acceso se realiza por la
-- API Node/Express mediante una conexión privada a PostgreSQL.
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.personalization_options enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_personalizations enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.store_settings enable row level security;

revoke all privileges on table
  public.admin_users,
  public.categories,
  public.products,
  public.product_images,
  public.product_variants,
  public.personalization_options,
  public.orders,
  public.order_items,
  public.order_item_personalizations,
  public.inventory_movements,
  public.store_settings
from anon, authenticated;

revoke all privileges on sequence
  public.order_code_seq
from anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Verificación: el resultado debe mostrar 11 filas, todas con RLS = true.
-- ---------------------------------------------------------------------------

select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in (
    'admin_users',
    'categories',
    'products',
    'product_images',
    'product_variants',
    'personalization_options',
    'orders',
    'order_items',
    'order_item_personalizations',
    'inventory_movements',
    'store_settings'
  )
order by tablename;
