// src/modules/orders/service.ts
// Бизнес-логика заказов: создание, смена статусов, управление остатками

import { OrderRepository } from './repository';
import { ProductRepository } from '../products/repository';
import { OrderListParams, STATUS_TRANSITIONS } from './types';
import { Order, CreateOrderDto, OrderStatus, PaginationMeta } from '../../shared/types/common';
import { AppError } from '../../shared/middleware/error-handler';
import pool from '../../shared/database/pool';

export class OrderService {
  private productRepo: ProductRepository;

  constructor(private repo: OrderRepository) {
    this.productRepo = new ProductRepository(pool);
  }

  /** Получить список заказов */
  async getAll(params: OrderListParams): Promise<{ data: Order[]; meta: PaginationMeta }> {
    return this.repo.findAllWithRelations(params);
  }

  /** Получить заказ по ID с позициями */
  async getById(id: number, tenantId: number): Promise<Order> {
    const order = await this.repo.findByIdWithDetails(id, tenantId);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Заказ не найден');
    }
    return order;
  }

  /** Создать заказ: рассчитать суммы, проверить остатки */
  async create(data: CreateOrderDto, tenantId: number): Promise<Order> {
    // Получаем товары для расчёта
    const productIds = data.items.map((i) => i.productId);
    const products: Record<number, { name: string; price: number; stock_quantity: number }> = {};

    for (const pid of productIds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const product: any = await this.productRepo.findByIdAndTenant(pid, tenantId);
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', `Товар с ID ${pid} не найден`);
      }
      products[pid] = {
        name: product.name,
        price: parseFloat(String(product.price)),
        stock_quantity: parseInt(String(product.stock_quantity), 10),
      };
    }

    // Проверяем остатки и рассчитываем суммы
    let subtotal = 0;
    const orderItems = data.items.map((item) => {
      const product = products[item.productId];
      if (product.stock_quantity < item.quantity) {
        throw new AppError(400, 'INSUFFICIENT_STOCK',
          `Недостаточно товара "${product.name}" на складе. Доступно: ${product.stock_quantity}, запрошено: ${item.quantity}`
        );
      }

      const discountPercent = item.discountPercent || 0;
      const unitPrice = product.price;
      const totalPrice = Math.round(item.quantity * unitPrice * (1 - discountPercent / 100) * 100) / 100;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        discountPercent,
        totalPrice,
      };
    });

    const totalAmount = Math.round(subtotal * 100) / 100;

    // Создаём заказ
    const order = await this.repo.createOrder({
      tenantId,
      clientId: data.clientId,
      managerId: data.managerId,
      subtotal,
      discountAmount: 0,
      totalAmount,
      deliveryType: data.deliveryType,
      deliveryAddress: data.deliveryAddress,
      deliveryCity: data.deliveryCity,
      notes: data.notes,
    });

    // Создаём позиции
    await this.repo.createOrderItems(
      orderItems.map((item) => ({
        ...item,
        orderId: order.id,
      }))
    );

    return this.repo.findByIdWithDetails(order.id, tenantId) as Promise<Order>;
  }

  /** Обновить заказ (доставка, заметки, оплата) */
  async update(
    id: number,
    data: {
      deliveryType?: string;
      deliveryAddress?: string;
      deliveryCity?: string;
      trackingNumber?: string;
      notes?: string;
      paymentStatus?: string;
      paidAmount?: number;
      discountAmount?: number;
    },
    tenantId: number
  ): Promise<Order> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any = await this.repo.findByIdWithDetails(id, tenantId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Заказ не найден');
    }

    // Если меняется скидка — пересчитать total_amount
    const updateData: Record<string, unknown> = {};
    if (data.deliveryType !== undefined) updateData.delivery_type = data.deliveryType;
    if (data.deliveryAddress !== undefined) updateData.delivery_address = data.deliveryAddress;
    if (data.deliveryCity !== undefined) updateData.delivery_city = data.deliveryCity;
    if (data.trackingNumber !== undefined) updateData.tracking_number = data.trackingNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.paymentStatus !== undefined) updateData.payment_status = data.paymentStatus;
    if (data.paidAmount !== undefined) updateData.paid_amount = data.paidAmount;
    if (data.discountAmount !== undefined) {
      updateData.discount_amount = data.discountAmount;
      const subtotal = parseFloat(String(existing.subtotal));
      updateData.total_amount = Math.round((subtotal - data.discountAmount) * 100) / 100;
    }

    if (Object.keys(updateData).length > 0) {
      await this.repo.update(id, updateData as Partial<Order>);
    }

    return this.repo.findByIdWithDetails(id, tenantId) as Promise<Order>;
  }

  /** Изменить статус заказа с валидацией переходов */
  async changeStatus(id: number, newStatus: OrderStatus, tenantId: number): Promise<Order> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order: any = await this.repo.findByIdWithDetails(id, tenantId);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Заказ не найден');
    }

    const currentStatus = String(order.status);
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(400, 'INVALID_STATUS_TRANSITION',
        `Нельзя перевести заказ из статуса "${currentStatus}" в "${newStatus}". Допустимые: ${allowedTransitions.join(', ') || 'нет'}`
      );
    }

    // Дополнительные поля при смене статуса
    const extraFields: Record<string, unknown> = {};

    if (newStatus === 'confirmed') {
      extraFields.confirmed_at = new Date();
      // При подтверждении — уменьшаем остатки товаров
      if (order.items) {
        for (const item of order.items) {
          await this.productRepo.updateStock(item.product_id, -(item.quantity));
        }
      }
    }

    if (newStatus === 'shipped') {
      extraFields.shipped_at = new Date();
    }

    if (newStatus === 'delivered') {
      extraFields.delivered_at = new Date();
    }

    if (newStatus === 'cancelled' || newStatus === 'returned') {
      // При отмене/возврате — возвращаем остатки (если заказ был подтверждён)
      const confirmedStatuses = ['confirmed', 'in_production', 'ready', 'shipped', 'delivered'];
      if (confirmedStatuses.includes(currentStatus) && order.items) {
        for (const item of order.items) {
          await this.productRepo.updateStock(item.product_id, item.quantity);
        }
      }
    }

    await this.repo.updateStatus(id, newStatus, extraFields);
    return this.repo.findByIdWithDetails(id, tenantId) as Promise<Order>;
  }

  /** Мягкое удаление заказа (отмена) */
  async delete(id: number, tenantId: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order: any = await this.repo.findByIdWithDetails(id, tenantId);
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Заказ не найден');
    }

    // Возвращаем остатки если заказ был подтверждён
    const currentStatus = String(order.status);
    const confirmedStatuses = ['confirmed', 'in_production', 'ready', 'shipped', 'delivered'];
    if (confirmedStatuses.includes(currentStatus) && order.items) {
      for (const item of order.items) {
        await this.productRepo.updateStock(item.product_id, item.quantity);
      }
    }

    await this.repo.softDelete(id);
  }
}
