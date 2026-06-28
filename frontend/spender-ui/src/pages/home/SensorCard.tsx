import type { SensorDto } from '../../api/model';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function SensorCard({ sensor }: { sensor: SensorDto | null | undefined }) {
  if (!sensor) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
        <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">In-room (HAT)</p>
        <p className="text-xs text-gray-400 mb-4">Budapest XI</p>
        <p className="text-sm text-gray-400">No readings yet.</p>
      </div>
    );
  }

  const updatedAt = new Date(sensor.recordedAt).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">In-room (HAT)</p>
      <p className="text-xs text-gray-400 mb-4">Budapest XI</p>
      <Row label="Temperature" value={`${sensor.temperatureCompensated.toFixed(1)}°C`} />
      <Row label="Feels like (BOM)" value={`${sensor.feelsLike.toFixed(1)}°C`} />
      <Row label="Feels like (HI)" value={`${sensor.feelsLikeHeatIndex.toFixed(1)}°C`} />
      <Row label="Humidity" value={`${sensor.humidity.toFixed(0)}%`} />
      <Row label="Pressure" value={`${sensor.pressure.toFixed(0)} hPa`} />
      <Row label="Dew point" value={`${sensor.dewPoint.toFixed(1)}°C`} />
      <p className="text-xs text-gray-400 mt-auto pt-3">Updated {updatedAt}</p>
    </div>
  );
}
