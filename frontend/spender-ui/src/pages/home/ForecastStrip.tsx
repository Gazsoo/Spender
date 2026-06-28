import type { ForecastDayDto } from '../../api/model';
import { Droplets } from 'lucide-react';
import { tempTone, weatherInfo } from './weather';

export default function ForecastStrip({ forecast }: { forecast: ForecastDayDto[] | null | undefined }) {
  if (!forecast || forecast.length === 0) return null;

  // shared vertical domain so every day's range bar is comparable
  const lo = Math.min(...forecast.map(d => d.tempMin));
  const hi = Math.max(...forecast.map(d => d.tempMax));
  const span = Math.max(1, hi - lo);
  const topPct = (v: number) => ((hi - v) / span) * 100;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="font-display text-sm font-bold tracking-tight text-gray-900">4-day forecast</p>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-1 sm:grid sm:gap-4"
           style={{ gridTemplateColumns: `repeat(${forecast.length}, minmax(0, 1fr))` }}>
        {forecast.map((day, i) => {
          const weekday = new Date(day.date).toLocaleDateString('hu-HU', { weekday: 'short' });
          const { Icon, label } = weatherInfo(day.weatherCode);
          const top = topPct(day.tempMax);
          const bottom = 100 - topPct(day.tempMin);
          return (
            <div
              key={day.date}
              className="flex min-w-[5.5rem] flex-1 flex-col items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-gray-50"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {i === 0 ? 'Today' : weekday}
              </span>
              <Icon size={26} strokeWidth={1.75} className="text-gray-700" aria-label={label} />

              <span className="text-sm font-bold tabular-nums text-gray-900">{day.tempMax.toFixed(0)}°</span>
              {/* vertical range bar, tinted from cold (bottom) to warm (top) */}
              <div className="relative h-20 w-1.5 rounded-full bg-gray-100">
                <div
                  className="absolute inset-x-0 rounded-full"
                  style={{
                    top: `${top}%`,
                    bottom: `${bottom}%`,
                    background: `linear-gradient(to top, ${tempTone(day.tempMin).base}, ${tempTone(day.tempMax).base})`,
                  }}
                />
              </div>
              <span className="text-sm font-medium tabular-nums text-gray-400">{day.tempMin.toFixed(0)}°</span>

              <span className="flex items-center gap-1 text-[11px] tabular-nums text-gray-400">
                <Droplets size={11} strokeWidth={2} />
                {day.precipitationMm.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
