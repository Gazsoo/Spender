import { useState } from 'react';
import { usePeople } from '../../hooks/usePeople';
import { useDebtSummary } from '../../hooks/useAnalytics';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { formatCurrency } from '../../utils/format';

const labelCls = 'text-[11px] font-medium text-gray-400 uppercase tracking-wide';
const inputCls = 'text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-amber-500 transition-colors min-w-[140px]';

export default function DebtPage() {
  const { data: people = [] } = usePeople();

  const [perspectiveId, setPerspectiveId] = useState(0);
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const activePerspective = perspectiveId || Number(people[0]?.id ?? 0);
  const { data, isLoading } = useDebtSummary(activePerspective, from || undefined, to || undefined);

  const net = Number(data?.netDebt ?? 0);
  const balanceLabel =
    net > 0 ? `owes ${formatCurrency(net)}` :
    net < 0 ? `is owed ${formatCurrency(Math.abs(net))}` :
              'is all settled';
  const balanceColor = net > 0 ? 'text-red-500' : net < 0 ? 'text-emerald-500' : 'text-gray-400';

  return (
    <div>
      <PageHeader title="Debt Balance" subtitle="Who owes whom" />

      <div className="flex gap-4 mb-5 flex-wrap items-end">
        {[
          { label: 'Perspective', content: (
            <select value={perspectiveId || activePerspective} onChange={e => setPerspectiveId(Number(e.target.value))} className={inputCls}>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )},
          { label: 'From', content: <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} /> },
          { label: 'To',   content: <input type="date" value={to}   onChange={e => setTo(e.target.value)}   className={inputCls} /> },
        ].map(({ label, content }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className={labelCls}>{label}</label>
            {content}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">{data?.perspectiveName}</p>
              <p className={`font-display font-black text-3xl tracking-tight ${balanceColor}`}>
                {balanceLabel}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                across {data?.transactionCount ?? 0} shared transaction{data?.transactionCount === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-3">Breakdown</p>
          {!data?.breakdown?.length ? (
            <p className="text-sm text-gray-400">No shared transactions.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Person','Amount','Transactions'].map((h, i) => (
                    <th key={h} className={`text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-2.5 border-b border-gray-100 ${i > 0 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map(row => {
                  const debt = Number(row.debt ?? 0);
                  const color = debt > 0 ? 'text-red-500' : debt < 0 ? 'text-emerald-500' : 'text-gray-400';
                  return (
                    <tr key={row.personId} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 text-sm text-gray-900">{row.personName}</td>
                      <td className={`py-2.5 text-right text-sm font-medium tabular-nums ${color}`}>
                        {debt > 0 ? '+' : ''}{formatCurrency(debt)}
                      </td>
                      <td className="py-2.5 text-right text-sm text-gray-400">{row.transactionCount}</td>
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
