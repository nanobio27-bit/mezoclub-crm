export interface Product {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_level: number;
  brand: string | null;
  is_active: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
