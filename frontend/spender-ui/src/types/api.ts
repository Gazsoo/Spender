/**
 * Hand-written types matching the API contract.
 * Run `npm run generate-types` to regenerate generated.d.ts for reference,
 * but keep these as the source of truth used by the app.
 */

export interface Category {
  id: number;
  name: string;
  color?: string | null;
  createdAt?: string;
}

export interface CategorySummary {
  categoryId: number;
  categoryName: string;
  color?: string | null;
  amount: number;
  transactionCount: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalAmount: number;
  transactionCount: number;
  categories: CategorySummary[];
}

export interface Person {
  id: number;
  name: string;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  createdAt?: string;
  categoryId: number;
  category?: Category;
  expenseType: number;
  paidById?: number | null;
  fundedById?: number | null;
  paidBy?: Person | null;
  fundedBy?: Person | null;
}

export interface DebtByPerson {
  personId: number;
  personName: string;
  debt: number;
  transactionCount: number;
}

export interface DebtSummary {
  perspectiveId: number;
  perspectiveName: string;
  netDebt: number;
  transactionCount: number;
  breakdown: DebtByPerson[];
}

export interface CreateTransactionRequest {
  amount: number;
  description: string;
  date?: string;
  categoryId: number;
  expenseType?: number;
  paidById?: number | null;
  fundedById?: number | null;
}

export interface UpdateTransactionRequest {
  amount: number;
  description: string;
  date?: string;
  categoryId: number;
  expenseType?: number;
  paidById?: number | null;
  fundedById?: number | null;
}

export interface CreateCategoryRequest {
  name: string;
  color?: string | null;
}

export interface UpdateCategoryRequest {
  name: string;
  color?: string | null;
}

// Matches C# ExpenseType enum values (0-3)
export const ExpenseType = {
  Personal:           0,
  Shared:             1,
  SharedPrepaidJoint: 2,
  SharedPrepaidByOne: 3,
} as const;
export type ExpenseTypeValue = typeof ExpenseType[keyof typeof ExpenseType];
