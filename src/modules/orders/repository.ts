import { BaseRepository } from '../../shared/database/base-repository';
import { Order } from './types';

class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders', true);
  }
}

export const orderRepository = new OrderRepository();
