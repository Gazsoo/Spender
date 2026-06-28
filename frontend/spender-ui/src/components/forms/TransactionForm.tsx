import { useState } from 'react';
import type { Transaction, Category, Person, ExpenseTypeValue } from '../../types';
import { ExpenseType } from '../../types';
import Button from '../ui/Button';

interface FormData {
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  expenseType: ExpenseTypeValue;
  paidById?: number;
  fundedById?: number;
}

interface TransactionFormProps {
  categories: Category[];
  people: Person[];
  initial?: Transaction;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}

const EXPENSE_TYPE_OPTIONS = [
  { value: ExpenseType.Personal,           label: 'Personal',      hint: 'My own expense, no splitting' },
  { value: ExpenseType.Shared,             label: 'Shared',        hint: 'Paid from my pocket — they owe me half' },
  { value: ExpenseType.SharedPrepaidJoint, label: 'Joint Account', hint: 'Paid from our joint account — already settled' },
  { value: ExpenseType.SharedPrepaidByOne, label: 'GF Prepaid',    hint: 'Paid from her account — I owe her half' },
];

const inputCls = 'w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-amber-500 transition-colors';
const labelCls = 'text-xs font-medium text-gray-500 uppercase tracking-wide';

export default function TransactionForm({ categories, people, initial, onSubmit, onCancel, isPending }: TransactionFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [amount,      setAmount]      = useState(initial ? String(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date,        setDate]        = useState(initial?.date ? initial.date.split('T')[0] : today);
  const [categoryId,  setCategoryId]  = useState(initial?.categoryId ? String(initial.categoryId) : '');
  const [expenseType, setExpenseType] = useState<ExpenseTypeValue>(initial?.expenseType ?? ExpenseType.Personal);
  const [paidById,    setPaidById]    = useState(initial?.paidById ? String(initial.paidById) : '');
  const [fundedById,  setFundedById]  = useState(initial?.fundedById ? String(initial.fundedById) : '');
  const [error,       setError]       = useState('');

  function handleExpenseTypeChange(value: ExpenseTypeValue) {
    setExpenseType(value);
    setPaidById('');
    setFundedById('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description || !date || !categoryId) { setError('All fields are required.'); return; }
    if (Number(amount) <= 0) { setError('Amount must be greater than 0.'); return; }
    if (expenseType === ExpenseType.Shared && !paidById) { setError('Select who paid for this shared expense.'); return; }
    if (expenseType === ExpenseType.SharedPrepaidByOne && !fundedById) { setError('Select who funded this prepaid expense.'); return; }
    setError('');
    onSubmit({
      amount: Number(amount), description, date, categoryId: Number(categoryId), expenseType,
      paidById:   paidById   ? Number(paidById)   : undefined,
      fundedById: fundedById ? Number(fundedById) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Amount</label>
        <input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Description</label>
        <input type="text" placeholder="e.g. Coffee shop" value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Type</label>
        <select value={expenseType} onChange={e => handleExpenseTypeChange(Number(e.target.value) as ExpenseTypeValue)} className={inputCls}>
          {EXPENSE_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label} — {opt.hint}</option>
          ))}
        </select>
      </div>

      {expenseType === ExpenseType.Shared && (
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Paid by</label>
          <select value={paidById} onChange={e => setPaidById(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {expenseType === ExpenseType.SharedPrepaidByOne && (
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Funded by</label>
          <select value={fundedById} onChange={e => setFundedById(e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : initial ? 'Update' : 'Add transaction'}
        </Button>
      </div>
    </form>
  );
}
