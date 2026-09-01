import * as defaultRepository from '../repositories/inventoryRepository.js';

function mapMovement(row) {
  return {
    id: row.id,
    movement_type: row.movement_type,
    quantity_change: row.quantity_change,
    previous_stock: row.previous_stock,
    new_stock: row.new_stock,
    note: row.note,
    created_at: row.created_at,
    product: { id: row.product_id, name: row.product_name, active: row.product_active },
    variant: {
      id: row.variant_id, sku: row.sku, name: row.variant_name,
      color: row.color, finish: row.finish, active: row.variant_active,
    },
    order: row.order_id ? { id: row.order_id, code: row.order_code, status: row.order_status } : null,
    admin: row.admin_id ? { id: row.admin_id, name: row.admin_name, email: row.admin_email } : null,
  };
}

export function createInventoryService(repository = defaultRepository) {
  return {
    async listMovements(filters) {
      const rows = await repository.listMovements(filters);
      const hasMore = rows.length > filters.limit;
      const page = hasMore ? rows.slice(0, filters.limit) : rows;
      return { items: page.map(mapMovement), nextCursor: hasMore ? page.at(-1).id : null };
    },
    listLowStock: () => repository.listLowStock(),
  };
}

export const inventoryService = createInventoryService();
