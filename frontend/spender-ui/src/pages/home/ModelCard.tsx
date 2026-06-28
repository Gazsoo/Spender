import type { OpenMeteoDto } from '../../api/model';
import { weatherInfo, shortTime } from './weather';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-gray-900">{value}</span>
    </div>
  );
}

export default function ModelCard({ data }: { data: OpenMeteoDto | null | undefined }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="font-display text-sm font-bold tracking-tight text-gray-900">Model · conditions</p>
      <p className="mt-0.5 text-xs text-gray-400">Open-Meteo · exact location</p>

      {!data ? (
        <p className="mt-6 text-sm text-gray-400">No data yet.</p>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-4">
            {(() => {
              const { Icon, label } = weatherInfo(data.weatherCode);
              return (
                <>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-50">
                    <Icon size={28} strokeWidth={1.75} className="text-gray-700" aria-hidden />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">
                      Feels like <span className="tabular-nums">{data.feelsLike.toFixed(1)}°</span>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-5">
            <Stat label="Humidity" value={`${data.humidity.toFixed(0)}%`} />
            <Stat label="Pressure" value={`${data.pressure.toFixed(0)} hPa`} />
            <Stat label="Wind" value={`${data.windSpeed.toFixed(0)} km/h`} />
          </div>

          <p className="mt-5 text-[11px] text-gray-400">Updated {shortTime(data.updatedAt)}</p>
        </>
      )}
    </section>
  );
}
