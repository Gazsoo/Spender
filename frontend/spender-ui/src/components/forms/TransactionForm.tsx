import { useState } from 'react';
import type { Transaction, Category, Person } from '../../types';
import { ExpenseType } from '../../types';
import Button from '../ui/Button';
import styles from './Form.module.css';

interface FormData {
  amount: number;
  description: string;
  date: string;
  categoryId: number;
  expenseType: number;
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
  { value: ExpenseType.Personal,          label: 'Personal',      hint: 'My own expense, no splitting' },
  { value: ExpenseType.Shared,            label: 'Shared',        hint: 'Paid from my pocket — they owe me half' },
  { value: ExpenseType.SharedPrepaidJoint, label: 'Joint Account', hint: 'Paid from our joint account — already settled' },
  { value: ExpenseType.SharedPrepaidByOne, label: 'GF Prepaid',   hint: 'Paid from her account — I owe her half' },
];

export default function TransactionForm({ categories, people, initial, onSubmit, onCancel, isPending }: TransactionFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [amount, setAmount]           = useState(initial ? String(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate]               = useState(initial?.date ? initial.date.split('T')[0] : today);
  const [categoryId, setCategoryId]   = useState(initial?.categoryId ? String(initial.categoryId) : '');
  const [expenseType, setExpenseType] = useState<number>(initial?.expenseType ?? ExpenseType.Personal);
  const [paidById, setPaidById]       = useState(initial?.paidById ? String(initial.paidById) : '');
  const [fundedById, setFundedById]   = useState(initial?.fundedById ? String(initial.fundedById) : '');
  const [error, setError]             = useState('');

  function handleExpenseTypeChange(value: number) {
    setExpenseType(value);
    setPaidById('');
    setFundedById('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description || !date || !categoryId) {
      setError('All fields are required.');
      return;
    }
    if (Number(amount) <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (expenseType === ExpenseType.Shared && !paidById) {
      setError('Select who paid for this shared expense.');
      return;
    }
    if (expenseType === ExpenseType.SharedPrepaidByOne && !fundedById) {
      setError('Select who funded this prepaid expense.');
      return;
    }
    setError('');
    onSubmit({
      amount: Number(amount),
      description,
      date,
      categoryId: Number(categoryId),
      expenseType,
      paidById:   paidById   ? Number(paidById)   : undefined,
      fundedById: fundedById ? Number(fundedById) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.field}>
        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label>Description</label>
        <input
          type="text"
          placeholder="e.g. Coffee shop"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label>Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Select…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label>Type</label>
        <select value={expenseType} onChange={e => handleExpenseTypeChange(Number(e.target.value))}>
          {EXPENSE_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label} — {opt.hint}</option>
          ))}
        </select>
      </div>

      {expenseType === ExpenseType.Shared && (
        <div className={styles.field}>
          <label>Paid by</label>
          <select value={paidById} onChange={e => setPaidById(e.target.value)}>
            <option value="">Select…</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {expenseType === ExpenseType.SharedPrepaidByOne && (
        <div className={styles.field}>
          <label>Funded by</label>
          <select value={fundedById} onChange={e => setFundedById(e.target.value)}>
            <option value="">Select…</option>
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : initial ? 'Update' : 'Add transaction'}
        </Button>
      </div>
    </form>
  );
}
