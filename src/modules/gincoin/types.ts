export interface GinCoinWallet {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
  level: string;
  created_at: Date;
  updated_at: Date;
}

export interface GinCoinTransaction {
  id: number;
  wallet_id: number;
  type: string;
  amount: number;
  source: string | null;
  reference_id: number | null;
  description: string | null;
  created_at: Date;
}
