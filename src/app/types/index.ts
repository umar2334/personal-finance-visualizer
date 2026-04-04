export interface Transaction {
  id: string;
  user_id: string;
  amount: number; // positive = income, negative = expense
  category: string;
  description: string;
  created_at: string;
}

export interface CategoryData {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}
