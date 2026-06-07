import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { usePeople } from '../../hooks/usePeople';
import type { Transaction } from '../../types';
import { ExpenseType } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import TransactionForm from '../../components/forms/TransactionForm';
import { formatCurrency, formatDate } from '../../utils/format';
import styles from './TransactionsPage.module.css';

const EXPENSE_TYPE_DISPLAY: Record<number, { label: string; color: string }> = {
  [ExpenseType.Personal]:           { label: 'Personal',  color: '#6b7280' },
  [ExpenseType.Shared]:             { label: 'Shared',    color: '#3b82f6' },
  [ExpenseType.SharedPrepaidJoint]: { label: 'Joint',     color: '#10b981' },
  [ExpenseType.SharedPrepaidByOne]: { label: 'GF Prepaid', color: '#8b5cf6' },
};

export default function TransactionsPage() {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] }              = useCategories();
  const { data: people = [] }                  = usePeople();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Transaction | null>(null);

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length} total`}
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add transaction
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : transactions.length === 0 ? (
          <p className={styles.empty}>No transactions yet. Add your first one!</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th className={styles.right}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const et = t.expenseType ?? ExpenseType.Personal;
                const typeDisplay = EXPENSE_TYPE_DISPLAY[et] ?? EXPENSE_TYPE_DISPLAY[ExpenseType.Personal];
                return (
                  <tr key={t.id}>
                    <td className={styles.date}>{formatDate(t.date)}</td>
                    <td>{t.description}</td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{ background: `${t.category?.color ?? '#6366f1'}22`, color: t.category?.color ?? 'var(--primary)' }}
                      >
                        {t.category?.name}
                      </span>
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{ background: `${typeDisplay.color}22`, color: typeDisplay.color }}
                      >
                        {typeDisplay.label}
                      </span>
                    </td>
                    <td className={`${styles.right} ${styles.amount}`}>{formatCurrency(t.amount)}</td>
                    <td className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => setEditing(t)} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={() => deleteMutation.mutate(Number(t.id))}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && (
        <Modal title="Add transaction" onClose={() => setShowCreate(false)}>
          <TransactionForm
            categories={categories}
            people={people}
            isPending={createMutation.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={data => {
              createMutation.mutate(
                { ...data, date: new Date(data.date).toISOString() },
                { onSuccess: () => setShowCreate(false) }
              );
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit transaction" onClose={() => setEditing(null)}>
          <TransactionForm
            categories={categories}
            people={people}
            initial={editing}
            isPending={updateMutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={data => {
              updateMutation.mutate(
                { id: Number(editing.id), data: { ...data, date: new Date(data.date).toISOString() } },
                { onSuccess: () => setEditing(null) }
              );
            }}
          />
        </Modal>
      )}
    </div>
  );
}
