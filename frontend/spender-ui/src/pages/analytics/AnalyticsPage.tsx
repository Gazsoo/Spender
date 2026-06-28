import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonthlyAnalytics, useYearlyAnalytics } from '../../hooks/useAnalytics';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { formatCurrency, MONTH_NAMES } from '../../utils/format';

const now = new Date();

export default function AnalyticsPage() {
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: monthly } = useMonthlyAnalytics(year, month);
  const { data: yearly }  = useYearlyAnalytics(year);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const maxMonthly = yearly ? Math.max(...yearly.map(m => m.totalAmount), 1) : 1;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Spending breakdown" />

      <div className="flex items-center gap-3 mb-5">
        <button onClick={prevMonth} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-base font-display font-bold text-gray-900 min-w-[140px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={nextMonth} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"><ChevronRight size={16} /></button>
      </div>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card>
          <h2 className="font-display font-bold text-sm text-gray-900 mb-4 tracking-tight">Monthly breakdown</h2>
          {!monthly || monthly.categories.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this month.</p>
          ) : (
            <>
              <div className="flex justify-between items-baseline mb-4 pb-3 border-b border-gray-100">
                <span className="text-xs text-gray-400">Total spent</span>
                <span className="font-display font-bold text-xl text-gray-900 tabular-nums">{formatCurrency(monthly.totalAmount)}</span>
              </div>
              <div className="flex flex-col gap-3">
                {monthly.categories.map(c => {
                  const pct = monthly.totalAmount > 0 ? Math.round((c.amount / monthly.totalAmount) * 100) : 0;
                  return (
                    <div key={c.categoryId} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <span className="w-2 h-2 rounded-full" style={{ background: c.color ?? '#F59E0B' }} />
                          {c.categoryName}
                        </div>
                        <div className="flex gap-2 items-baseline">
                          <span className="text-xs text-gray-400">{pct}%</span>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(c.amount)}</span>
                        </div>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c.color ?? '#F59E0B' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="font-display font-bold text-sm text-gray-900 mb-4 tracking-tight">{year} — monthly spending</h2>
          {!yearly || yearly.every(m => m.totalAmount === 0) ? (
            <p className="text-sm text-gray-400">No data for {year}.</p>
          ) : (
            <div className="flex items-end gap-1.5 h-44">
              {yearly.map(m => {
                const heightPct = (m.totalAmount / maxMonthly) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center h-full">
                    <span className="text-[9px] text-gray-300 writing-mode-vertical rotate-180 whitespace-nowrap h-12 overflow-hidden">
                      {m.totalAmount > 0 ? formatCurrency(m.totalAmount) : ''}
                    </span>
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full rounded-t-sm transition-all duration-500 min-h-[2px]"
                        style={{ height: `${heightPct}%`, background: '#F59E0B', opacity: 0.85 }}
                        title={formatCurrency(m.totalAmount)}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">{MONTH_NAMES[m.month - 1].slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
