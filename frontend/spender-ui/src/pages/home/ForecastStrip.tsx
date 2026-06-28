import type { ForecastDayDto } from '../../api/model';

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 59) return '🌦️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '❄️';
  if (code <= 84) return '🌦️';
  return '⛈️';
}

export default function ForecastStrip({ forecast }: { forecast: ForecastDayDto[] | null | undefined }) {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-4">4-day forecast</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${forecast.length}, 1fr)` }}>
        {forecast.map((day) => {
          const label = new Date(day.date).toLocaleDateString('hu-HU', { weekday: 'short' });
          return (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
              <span className="text-2xl leading-none">{weatherEmoji(day.weatherCode)}</span>
              <span className="text-sm font-medium text-gray-900 tabular-nums">
                {day.tempMin.toFixed(0)}–{day.tempMax.toFixed(0)}°
              </span>
              <span className="text-xs text-gray-400 tabular-nums">
                {day.precipitationMm.toFixed(0)} mm
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
