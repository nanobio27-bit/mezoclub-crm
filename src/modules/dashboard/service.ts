// src/modules/dashboard/service.ts
// Бизнес-логика дашборда — агрегация данных

import { DashboardRepository } from './repository';
import { DashboardData } from '../../shared/types/common';

export class DashboardService {
  constructor(private repo: DashboardRepository) {}

  /** Получить все данные для главного экрана */
  async getDashboardData(tenantId: number): Promise<DashboardData> {
    // Параллельно запрашиваем все метрики
    const [
      todayRevenue,
      yesterdayRevenue,
      activeOrders,
      activeClients,
      lowStockProducts,
      recentOrders,
      topProducts,
      ordersByStatus,
    ] = await Promise.all([
      this.repo.getTodayRevenue(tenantId),
      this.repo.getYesterdayRevenue(tenantId),
      this.repo.getActiveOrdersCount(tenantId),
      this.repo.getActiveClientsCount(tenantId),
      this.repo.getLowStockCount(tenantId),
      this.repo.getRecentOrders(tenantId),
      this.repo.getTopProducts(tenantId),
      this.repo.getOrdersByStatus(tenantId),
    ]);

    // Расчёт процента изменения выручки
    let todayRevenueChange = 0;
    if (yesterdayRevenue > 0) {
      todayRevenueChange = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 * 10) / 10;
    } else if (todayRevenue > 0) {
      todayRevenueChange = 100;
    }

    return {
      todayRevenue,
      todayRevenueChange,
      activeOrders,
      activeClients,
      lowStockProducts,
      recentOrders,
      topProducts,
      ordersByStatus,
    } as DashboardData;
  }
}
