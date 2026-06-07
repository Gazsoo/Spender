import { useState } from 'react';
import { usePeople } from '../../hooks/usePeople';
import { useDebtSummary } from '../../hooks/useAnalytics';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { formatCurrency } from '../../utils/format';
import styles from './DebtPage.module.css';

export default function DebtPage() {
  const { data: people = [] } = usePeople();

  const [perspectiveId, setPerspectiveId] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const activePerspective = perspectiveId || Number(people[0]?.id ?? 0);
  const { data, isLoading } = useDebtSummary(activePerspective, from || undefined, to || undefined);

  const net = Number(data?.netDebt ?? 0);

  const balanceLabel =
    net > 0  ? `owes ${formatCurrency(net)}` :
    net < 0  ? `is owed ${formatCurrency(Math.abs(net))}` :
               'is all settled';

  const balanceColor =
    net > 0  ? 'var(--danger)'  :
    net < 0  ? 'var(--success)' :
               'var(--text-muted)';

  return (
    <div>
      <PageHeader title="Debt Balance" subtitle="Who owes whom" />

      <div className={styles.controls}>
        <div className={styles.controlField}>
          <label>Perspective</label>
          <select
            value={perspectiveId || activePerspective}
            onChange={e => setPerspectiveId(Number(e.target.value))}
          >
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.controlField}>
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>

        <div className={styles.controlField}>
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      <div className={styles.grid}>
        <Card>
          {isLoading ? (
            <p className={styles.empty}>Loading…</p>
          ) : (
            <div className={styles.balanceCard}>
              <p className={styles.perspectiveName}>{data?.perspectiveName}</p>
              <p className={styles.balance} style={{ color: balanceColor }}>
                {balanceLabel}
              </p>
              <p className={styles.txCount}>
                across {data?.transactionCount ?? 0} shared transaction{data?.transactionCount === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </Card>

        <Card>
          <p className={styles.cardTitle}>Breakdown</p>
          {!data?.breakdown?.length ? (
            <p className={styles.empty}>No shared transactions.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Person</th>
                  <th className={styles.right}>Amount</th>
                  <th className={styles.right}>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map(row => {
                  const debt = Number(row.debt ?? 0);
                  const color = debt > 0 ? 'var(--danger)' : debt < 0 ? 'var(--success)' : 'var(--text-muted)';
                  return (
                    <tr key={row.personId}>
                      <td>{row.personName}</td>
                      <td className={styles.right} style={{ color, fontWeight: 500 }}>
                        {debt > 0 ? '+' : ''}{formatCurrency(debt)}
                      </td>
                      <td className={styles.right + ' ' + styles.muted}>{row.transactionCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
