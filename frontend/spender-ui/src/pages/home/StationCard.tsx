import type { HungaroMetDto } from '../../api/model';
import { windDir, shortTime } from './weather';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-gray-900">{value}</span>
    </div>
  );
}

function Compass({ deg, speed }: { deg: number; speed: number }) {
  return (
    <div className="relative h-28 w-28 shrink-0 rounded-full border border-gray-200 bg-gray-50">
      {(['N', 'E', 'S', 'W'] as const).map((c, i) => (
        <span
          key={c}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-wide text-gray-400"
          style={{ transform: `rotate(${i * 90}deg) translateY(-46px) rotate(${-i * 90}deg)` }}
        >
          {c}
        </span>
      ))}
      {/* arrow points the way the wind is heading (FROM + 180°) */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${deg + 180}deg)` }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div
            className="mx-auto"
            style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '12px solid #0F1620',
            }}
          />
          <div className="mx-auto h-9 w-[3px] rounded-full bg-gray-300" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white shadow-sm">
        <span className="font-display text-base font-bold leading-none tabular-nums text-gray-900">
          {speed.toFixed(1)}
        </span>
        <span className="text-[8px] uppercase tracking-wide text-gray-400">m/s</span>
      </div>
    </div>
  );
}

export default function StationCard({ data }: { data: HungaroMetDto | null | undefined }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="font-display text-sm font-bold tracking-tight text-gray-900">Station · wind</p>
      <p className="mt-0.5 text-xs text-gray-400">HungaroMet · Lágymányos</p>

      {!data ? (
        <p className="mt-6 text-sm text-gray-400">No observation yet.</p>
      ) : (
        <div className="mt-5 flex items-center gap-6">
            <Compass deg={data.windDirection} speed={data.windSpeed} />
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4">
              <Stat label="From" value={windDir(data.windDirection)} />
              <Stat label="Humidity" value={`${data.humidity.toFixed(0)}%`} />
              <Stat label="Pressure" value={`${data.pressure.toFixed(0)} hPa`} />
              <Stat label="Observed" value={shortTime(data.observedAt)} />
            </div>
        </div>
      )}
    </section>
  );
}
