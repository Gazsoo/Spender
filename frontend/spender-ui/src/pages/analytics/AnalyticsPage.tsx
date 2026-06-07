import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonthlyAnalytics, useYearlyAnalytics } from '../../hooks/useAnalytics';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { formatCurrency, MONTH_NAMES } from '../../utils/format';
import styles from './AnalyticsPage.module.css';

const now = new Date();

export default function AnalyticsPage() {
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: monthly } = useMonthlyAnalytics(year, month);
  const { data: yearly }  = useYearlyAnalytics(year);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const maxMonthly = yearly ? Math.max(...yearly.map(m => m.totalAmount), 1) : 1;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Spending breakdown" />

      {/* Month picker */}
      <div className={styles.picker}>
        <button className={styles.chevron} onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className={styles.pickerLabel}>{MONTH_NAMES[month - 1]} {year}</span>
        <button className={styles.chevron} onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      <div className={styles.grid}>
        {/* Monthly summary */}
        <Card>
          <h2 className={styles.cardTitle}>Monthly breakdown</h2>
          {!monthly || monthly.categories.length === 0 ? (
            <p className={styles.empty}>No data for this month.</p>
          ) : (
            <>
              <div className={styles.total}>
                <span className={styles.totalLabel}>Total spent</span>
                <span className={styles.totalValue}>{formatCurrency(monthly.totalAmount)}</span>
              </div>
              <div className={styles.categories}>
                {monthly.categories.map(c => {
                  const pct = monthly.totalAmount > 0
                    ? Math.round((c.amount / monthly.totalAmount) * 100)
                    : 0;
                  return (
                    <div key={c.categoryId} className={styles.catRow}>
                      <div className={styles.catHeader}>
                        <div className={styles.catName}>
                          <span className={styles.dot} style={{ background: c.color ?? 'var(--primary)' }} />
                          {c.categoryName}
                        </div>
                        <div className={styles.catRight}>
                          <span className={styles.catPct}>{pct}%</span>
                          <span className={styles.catAmount}>{formatCurrency(c.amount)}</span>
                        </div>
                      </div>
                      <div className={styles.bar}>
                        <div className={styles.barFill} style={{ width: `${pct}%`, background: c.color ?? 'var(--primary)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Yearly bar chart */}
        <Card>
          <h2 className={styles.cardTitle}>{year} — monthly spending</h2>
          {!yearly || yearly.every(m => m.totalAmount === 0) ? (
            <p className={styles.empty}>No data for {year}.</p>
          ) : (
            <div className={styles.yearChart}>
              {yearly.map(m => {
                const heightPct = (m.totalAmount / maxMonthly) * 100;
                return (
                  <div key={m.month} className={styles.barCol}>
                    <span className={styles.barColAmount}>
                      {m.totalAmount > 0 ? formatCurrency(m.totalAmount) : ''}
                    </span>
                    <div className={styles.barColTrack}>
                      <div
                        className={styles.barColFill}
                        style={{ height: `${heightPct}%` }}
                        title={formatCurrency(m.totalAmount)}
                      />
                    </div>
                    <span className={styles.barColLabel}>{MONTH_NAMES[m.month - 1].slice(0, 3)}</span>
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
