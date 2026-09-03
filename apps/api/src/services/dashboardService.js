import { STORE_TIMEZONE } from '../config/timezone.js';
import * as defaultRepository from '../repositories/dashboardRepository.js';

const integer = (value) => Number(value ?? 0);
const money = (value) => Number(value ?? 0).toFixed(2);

export function createDashboardService(repository = defaultRepository, timezone = STORE_TIMEZONE) {
  return {
    async get() {
      const row = await repository.getDashboard(timezone);
      return {
        generated_at: row.generated_at,
        timezone,
        orders: {
          active_reservations: integer(row.active_reservations),
          confirmed: integer(row.confirmed),
          preparing: integer(row.preparing),
          completed_today: integer(row.completed_today),
        },
        sales: {
          today_count: integer(row.today_count),
          today_total: money(row.today_total),
          month_count: integer(row.month_count),
          month_total: money(row.month_total),
        },
        inventory: {
          low_stock_variants: integer(row.low_stock_variants),
          out_of_stock_variants: integer(row.out_of_stock_variants),
        },
        recent_orders: row.recent_orders ?? [],
        top_products_month: row.top_products_month ?? [],
      };
    },
  };
}

export const dashboardService = createDashboardService();
