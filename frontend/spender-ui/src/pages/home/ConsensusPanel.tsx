import type { HomeDashboardResponse } from '../../api/model';
import { tempTone } from './weather';

interface Source {
  key: string;
  name: string;
  place: string;
  temp: number | null;
  primary?: boolean;
}

function Dot({ left, tone, primary }: { left: number; tone: string; primary?: boolean }) {
  return (
    <div
      className="home-dot absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-700 ease-out"
      style={{
        left: `${left}%`,
        width: primary ? 16 : 11,
        height: primary ? 16 : 11,
        background: tone,
        boxShadow: primary ? `0 0 0 4px ${tone}33` : 'none',
      }}
    />
  );
}

export default function ConsensusPanel({ data }: { data: HomeDashboardResponse | undefined }) {
  const sources: Source[] = [
    { key: 'room',    name: 'Room',    place: 'HAT sensor',  temp: data?.sensor?.temperatureCompensated ?? null, primary: true },
    { key: 'station', name: 'Station', place: 'Lágymányos',  temp: data?.hungaromet?.temperature ?? null },
    { key: 'model',   name: 'Model',   place: 'Open-Meteo',  temp: data?.openMeteo?.temperature ?? null },
  ];

  const temps = sources.map(s => s.temp).filter((t): t is number => t != null);
  const min = temps.length ? Math.min(...temps) : 0;
  const max = temps.length ? Math.max(...temps) : 0;
  const spread = max - min;
  const pad = Math.max(0.8, spread * 0.6);
  const lo = min - pad;
  const hi = max + pad;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;

  return (
    <section className="flex flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-sm font-bold tracking-tight text-gray-900">Three readings</p>
        {temps.length > 1 && (
          <p className="text-xs text-gray-400">
            <span className="font-semibold tabular-nums text-gray-700">{spread.toFixed(1)}°</span> spread
          </p>
        )}
      </div>
      <p className="mt-0.5 text-xs text-gray-400">Same place, three opinions</p>

      {/* shared scale */}
      <div className="relative mx-1 mt-7 mb-6 h-1.5 rounded-full bg-gray-100">
        {sources.map(s =>
          s.temp == null ? null : (
            <Dot key={s.key} left={pct(s.temp)} tone={tempTone(s.temp).base} primary={s.primary} />
          ),
        )}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {sources.map(s => (
          <div key={s.key} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
            <div className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.temp == null ? '#D1D5DB' : tempTone(s.temp).base }}
              />
              <span className="text-sm font-medium text-gray-900">{s.name}</span>
              <span className="text-xs text-gray-400">{s.place}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-gray-900">
              {s.temp == null ? '—' : `${s.temp.toFixed(1)}°`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
