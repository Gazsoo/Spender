import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useTransactions, useCreateTransaction } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useMonthlyAnalytics } from '../../hooks/useAnalytics';
import { formatCurrency, formatDate, MONTH_NAMES } from '../../utils/format';
import type { Category } from '../../api/model';

const now = new Date();

const inputCls = 'w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-amber-500 transition-colors';

function QuickAdd({ categories, onSuccess }: { categories: Category[]; onSuccess: () => void }) {
  const createMutation = useCreateTransaction();
  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description || !categoryId) { setError('Fill in all fields.'); return; }
    if (Number(amount) <= 0) { setError('Amount must be greater than 0.'); return; }
    setError('');
    createMutation.mutate(
      { amount: Number(amount), description, date: new Date().toISOString(), categoryId: Number(categoryId), expenseType: 0 },
      {
        onSuccess: () => {
          setAmount('');
          setDescription('');
          setCategoryId('');
          setDone(true);
          setTimeout(() => setDone(false), 1500);
          onSuccess();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
      <div className="flex items-baseline gap-1 border-b border-gray-100 pb-3">
        <span className="text-4xl font-display font-black text-gray-200">£</span>
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="flex-1 text-4xl font-display font-black bg-transparent outline-none text-gray-900 placeholder-gray-200 w-0"
        />
      </div>
      <input
        type="text"
        placeholder="What was it for?"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className={inputCls}
      />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
        <option value="">Category…</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="mt-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-display font-bold rounded-xl py-3 text-sm transition-colors cursor-pointer"
      >
        {done ? <><Check size={14} /> Added</> : createMutation.isPending ? 'Adding…' : 'Add spending'}
      </button>
    </form>
  );
}

export default function DashboardPage() {
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] }   = useCategories();
  const { data: monthly }           = useMonthlyAnalytics(now.getFullYear(), now.getMonth() + 1);

  const recent   = transactions.slice(0, 6);
  const total    = monthly?.totalAmount ?? 0;
  const txCount  = monthly?.transactionCount ?? 0;

  const formattedTotal = formatCurrency(total);
  const currencySymbol = formattedTotal[0];
  const numericPart    = formattedTotal.slice(1);

  return (
    <div className="grid grid-cols-3 gap-4" style={{ gridTemplateRows: 'auto auto auto' }}>

      {/* ── HERO — 2 cols × 2 rows, dark card with clipping number ── */}
      <div
        className="rounded-2xl p-7 relative overflow-hidden flex flex-col col-span-2 row-span-2"
        style={{ background: '#111827', minHeight: 280 }}
      >
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.1em] text-white/40">
          {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
        </p>
        <p className="text-[13px] text-white/50 mt-1.5">Total spent</p>

        {txCount > 0 && (
          <p className="text-xs text-white/35 mt-auto mb-1">
            {txCount} transaction{txCount !== 1 ? 's' : ''} · avg {formatCurrency(total / txCount)}
          </p>
        )}

        {/* Signature: massive number bleeds off card bottom */}
        <div
          className="font-display font-black text-white tracking-[-0.04em] leading-none absolute left-7 right-7 select-none"
          style={{ fontSize: 'clamp(72px, 10vw, 116px)', bottom: -10, fontVariantNumeric: 'tabular-nums' }}
        >
          <span style={{ color: '#F59E0B' }}>{currencySymbol}</span>{numericPart}
        </div>
      </div>

      {/* ── QUICK ADD — col 3, rows 1–2 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col col-start-3 row-span-2">
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.1em] text-gray-400 mb-5">
          Quick add
        </p>
        <QuickAdd categories={categories} onSuccess={() => {}} />
      </div>

      {/* ── TOP CATEGORIES — col 1, row 3 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-start-1 row-start-3">
        <div className="flex items-center justify-between mb-5">
          <span className="font-display font-bold text-sm text-gray-900 tracking-tight">Top categories</span>
          <Link to="/analytics" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Analytics <ArrowRight size={11} />
          </Link>
        </div>
        {!monthly || monthly.categories.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {monthly.categories.slice(0, 5).map(c => {
              const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
              return (
                <div key={c.categoryId} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm text-gray-900">
                    <span>{c.categoryName}</span>
                    <span className="text-gray-500">{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: c.color ?? '#F59E0B' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RECENT TRANSACTIONS — col 2–3, row 3 ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm col-start-2 col-span-2 row-start-3">
        <div className="flex items-center justify-between mb-5">
          <span className="font-display font-bold text-sm text-gray-900 tracking-tight">Recent</span>
          <Link to="/transactions" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet.</p>
        ) : (
          <div className="flex flex-col">
            {recent.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t.category?.color ?? '#F59E0B' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-gray-900 truncate">{t.description}</span>
                  <span className="text-xs text-gray-400">{t.category?.name} · {formatDate(t.date)}</span>
                </div>
                <span className="text-sm font-medium tabular-nums text-gray-900 whitespace-nowrap">
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
