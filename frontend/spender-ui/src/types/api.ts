/**
 * Hand-written type aliases over the auto-generated OpenAPI schema.
 *
 * Run `npm run generate-types` (with the API running) to regenerate
 * src/types/generated.d.ts, then keep these aliases in sync if the
 * schema changes.
 */
import type { components } from './generated';

export type Transaction = components['schemas']['Transaction'];
export type Category = components['schemas']['Category'];
export type MonthlySummary = components['schemas']['MonthlySummary'];
export type CategorySummary = components['schemas']['CategorySummary'];
export type CreateTransactionRequest = components['schemas']['CreateTransactionRequest'];
export type UpdateTransactionRequest = components['schemas']['UpdateTransactionRequest'];
export type CreateCategoryRequest = components['schemas']['CreateCategoryRequest'];
export type UpdateCategoryRequest = components['schemas']['UpdateCategoryRequest'];
export type Person       = components['schemas']['Person'];
export type DebtSummary  = components['schemas']['DebtSummary'];
export type DebtByPerson = components['schemas']['DebtByPerson'];

export const ExpenseType = {
  Personal:          'personal',
  Shared:            'shared',
  SharedPrepaidJoint: 'shared-prepaid-joint',
  SharedPrepaidByOne: 'shared-prepaid-by-one',
} as const;
export type ExpenseTypeValue = typeof ExpenseType[keyof typeof ExpenseType];
