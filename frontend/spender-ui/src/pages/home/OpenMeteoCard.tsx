import type { OpenMeteoDto } from '../../api/model';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function OpenMeteoCard({ data }: { data: OpenMeteoDto | null | undefined }) {
  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
        <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">Open-Meteo</p>
        <p className="text-xs text-gray-400 mb-4">model · exact location</p>
        <p className="text-sm text-gray-400">No data yet.</p>
      </div>
    );
  }

  const updatedAt = new Date(data.updatedAt).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">Open-Meteo</p>
      <p className="text-xs text-gray-400 mb-4">model · exact location</p>
      <Row label="Temperature" value={`${data.temperature.toFixed(1)}°C`} />
      <Row label="Feels like" value={`${data.feelsLike.toFixed(1)}°C`} />
      <Row label="Humidity" value={`${data.humidity.toFixed(0)}%`} />
      <Row label="Pressure" value={`${data.pressure.toFixed(0)} hPa`} />
      <Row label="Wind" value={`${data.windSpeed.toFixed(1)} km/h`} />
      <p className="text-xs text-gray-400 mt-auto pt-3">Updated {updatedAt}</p>
    </div>
  );
}
