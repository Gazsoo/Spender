import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, ArrowLeftRight, Tag } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useMonthlyAnalytics } from '../../hooks/useAnalytics';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { formatCurrency, formatDate, MONTH_NAMES } from '../../utils/format';
import styles from './DashboardPage.module.css';

const now = new Date();

export default function DashboardPage() {
  const { data: transactions = [] }   = useTransactions();
  const { data: categories = [] }     = useCategories();
  const { data: monthly }             = useMonthlyAnalytics(now.getFullYear(), now.getMonth() + 1);

  const recent = transactions.slice(0, 5);

  return (
    <div>
      <PageHeader
        title={`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`}
        subtitle="Here's your spending overview"
      />

      {/* Summary cards */}
      <div className={styles.stats}>
        <Card className={styles.stat}>
          <div className={styles.statIcon} style={{ background: 'rgba(99,102,241,0.15)' }}>
            <TrendingUp size={18} color="var(--primary)" />
          </div>
          <div>
            <div className={styles.statValue}>{formatCurrency(monthly?.totalAmount ?? 0)}</div>
            <div className={styles.statLabel}>Spent this month</div>
          </div>
        </Card>

        <Card className={styles.stat}>
          <div className={styles.statIcon} style={{ background: 'rgba(34,197,94,0.12)' }}>
            <ArrowLeftRight size={18} color="var(--success)" />
          </div>
          <div>
            <div className={styles.statValue}>{monthly?.transactionCount ?? 0}</div>
            <div className={styles.statLabel}>Transactions this month</div>
          </div>
        </Card>

        <Card className={styles.stat}>
          <div className={styles.statIcon} style={{ background: 'rgba(251,191,36,0.12)' }}>
            <Tag size={18} color="#fbbf24" />
          </div>
          <div>
            <div className={styles.statValue}>{categories.length}</div>
            <div className={styles.statLabel}>Categories</div>
          </div>
        </Card>
      </div>

      <div className={styles.grid}>
        {/* Recent transactions */}
        <Card>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent transactions</h2>
            <Link to="/transactions" className={styles.cardLink}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className={styles.empty}>No transactions yet.</p>
          ) : (
            <div className={styles.list}>
              {recent.map(t => (
                <div key={t.id} className={styles.row}>
                  <div
                    className={styles.dot}
                    style={{ background: t.category?.color ?? '#6366f1' }}
                  />
                  <div className={styles.rowMain}>
                    <span className={styles.rowDesc}>{t.description}</span>
                    <span className={styles.rowMeta}>{t.category?.name} · {formatDate(t.date)}</span>
                  </div>
                  <span className={styles.rowAmount}>{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top categories this month */}
        <Card>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top categories</h2>
            <Link to="/analytics" className={styles.cardLink}>
              Analytics <ArrowRight size={13} />
            </Link>
          </div>
          {!monthly || monthly.categories.length === 0 ? (
            <p className={styles.empty}>No data for this month.</p>
          ) : (
            <div className={styles.categories}>
              {monthly.categories.slice(0, 5).map(c => {
                const pct = monthly.totalAmount > 0
                  ? Math.round((c.amount / monthly.totalAmount) * 100)
                  : 0;
                return (
                  <div key={c.categoryId} className={styles.catRow}>
                    <div className={styles.catLabel}>
                      <span>{c.categoryName}</span>
                      <span className={styles.textMuted}>{pct}%</span>
                    </div>
                    <div className={styles.bar}>
                      <div className={styles.barFill} style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className={styles.catAmount}>{formatCurrency(c.amount)}</span>
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
