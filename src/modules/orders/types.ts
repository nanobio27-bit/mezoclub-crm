export interface Order {
  id: number;
  client_id: number;
  user_id: number;
  status: string;
  total_amount: number;
  discount_amount: number;
  payment_status: string;
  notes: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
}

export interface CreateOrderInput {
  client_id: number;
  discount_amount?: number;
  notes?: string;
  items: { product_id: number; quantity: number }[];
}
