import type { HomeDashboardResponse } from '../../api/model';
import { Wind, Ban, Equal, AlertTriangle, type LucideIcon } from 'lucide-react';
import { windowAdvice, type WindowMode } from './weather';

const STYLE: Record<WindowMode, { Icon: LucideIcon; fg: string; bg: string; ring: string }> = {
  open:    { Icon: Wind,  fg: '#0F9384', bg: 'rgba(43,183,164,0.10)', ring: 'rgba(43,183,164,0.22)' },
  closed:  { Icon: Ban,   fg: '#C26527', bg: 'rgba(230,132,58,0.10)', ring: 'rgba(230,132,58,0.22)' },
  neutral: { Icon: Equal, fg: '#6B7280', bg: 'rgba(107,114,128,0.08)', ring: 'rgba(107,114,128,0.18)' },
};

export default function WindowAdvice({ data }: { data: HomeDashboardResponse | undefined }) {
  const inside = data?.sensor;
  const out = data?.hungaromet;
  const outTemp = out?.temperature ?? data?.openMeteo?.temperature;
  const outRh = out?.humidity ?? data?.openMeteo?.humidity;

  if (!inside || outTemp == null || outRh == null) return null;

  const advice = windowAdvice({
    inTemp: inside.temperatureCompensated,
    inDew: inside.dewPoint,
    outTemp,
    outRh,
  });
  const s = STYLE[advice.mode];

  return (
    <section
      className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      style={{ background: s.bg }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white"
        style={{ boxShadow: `0 0 0 4px ${s.ring}` }}
      >
        <s.Icon size={22} strokeWidth={2} style={{ color: s.fg }} aria-hidden />
      </div>

      <div className="min-w-0">
        <p className="font-display text-sm font-bold tracking-tight text-gray-900 sm:text-base">
          {advice.headline}
        </p>
        <p className="mt-0.5 text-sm text-gray-600">{advice.detail}</p>
        {advice.caveat && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
            {advice.caveat}
          </p>
        )}
      </div>
    </section>
  );
}
