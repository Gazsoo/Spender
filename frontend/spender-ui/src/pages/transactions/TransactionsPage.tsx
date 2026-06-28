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

const EXPENSE_TYPE_DISPLAY: Record<number, { label: string; color: string }> = {
  [ExpenseType.Personal]:           { label: 'Personal',   color: '#6b7280' },
  [ExpenseType.Shared]:             { label: 'Shared',     color: '#3b82f6' },
  [ExpenseType.SharedPrepaidJoint]: { label: 'Joint',      color: '#10b981' },
  [ExpenseType.SharedPrepaidByOne]: { label: 'GF Prepaid', color: '#8b5cf6' },
};

const iconBtn = 'p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors';

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
        action={<Button onClick={() => setShowCreate(true)}><Plus size={14} /> Add transaction</Button>}
      />

      <Card>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-2">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No transactions yet. Add your first one!</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Date','Description','Category','Type','Amount',''].map((h, i) => (
                  <th
                    key={i}
                    className={`text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-3 px-3 border-b border-gray-100 first:pl-0 ${i === 4 ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const et = t.expenseType ?? ExpenseType.Personal;
                const typeDisplay = EXPENSE_TYPE_DISPLAY[et] ?? EXPENSE_TYPE_DISPLAY[ExpenseType.Personal];
                return (
                  <tr key={t.id} className="group border-b border-gray-100 last:border-0">
                    <td className="px-3 py-3 first:pl-0 text-sm text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{t.description}</td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${t.category?.color ?? '#6366f1'}22`, color: t.category?.color ?? '#6366f1' }}
                      >
                        {t.category?.name}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: `${typeDisplay.color}22`, color: typeDisplay.color }}
                      >
                        {typeDisplay.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-gray-900">{formatCurrency(t.amount)}</td>
                    <td className="px-3 py-3 first:pl-0">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className={iconBtn} onClick={() => setEditing(t)} title="Edit"><Pencil size={13} /></button>
                        <button
                          className={`${iconBtn} hover:!text-red-500`}
                          onClick={() => deleteMutation.mutate(Number(t.id))}
                          disabled={deleteMutation.isPending}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
            categories={categories} people={people}
            isPending={createMutation.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={data => createMutation.mutate(
              { ...data, date: new Date(data.date).toISOString() },
              { onSuccess: () => setShowCreate(false) },
            )}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit transaction" onClose={() => setEditing(null)}>
          <TransactionForm
            categories={categories} people={people}
            initial={editing}
            isPending={updateMutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={data => updateMutation.mutate(
              { id: Number(editing.id), data: { ...data, date: new Date(data.date).toISOString() } },
              { onSuccess: () => setEditing(null) },
            )}
          />
        </Modal>
      )}
    </div>
  );
}
