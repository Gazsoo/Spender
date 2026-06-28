import type { HungaroMetDto } from '../../api/model';

const WIND_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function windDir(deg: number): string {
  return WIND_DIRS[Math.round(deg / 22.5) % 16];
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function HungarometCard({ data }: { data: HungaroMetDto | null | undefined }) {
  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
        <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">HungaroMet</p>
        <p className="text-xs text-gray-400 mb-4">Lágymányos</p>
        <p className="text-sm text-gray-400">No data yet.</p>
      </div>
    );
  }

  const obsAt = new Date(data.observedAt).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
      <p className="font-display font-bold text-sm text-gray-900 tracking-tight mb-0.5">HungaroMet</p>
      <p className="text-xs text-gray-400 mb-4">Lágymányos</p>
      <Row label="Temperature" value={`${data.temperature.toFixed(1)}°C`} />
      <Row label="Feels like (BOM)" value={`${data.feelsLike.toFixed(1)}°C`} />
      <Row label="Feels like (HI)" value={`${data.feelsLikeHeatIndex.toFixed(1)}°C`} />
      <Row label="Humidity" value={`${data.humidity.toFixed(0)}%`} />
      <Row label="Pressure" value={`${data.pressure.toFixed(0)} hPa`} />
      <Row label="Wind" value={`${data.windSpeed.toFixed(1)} m/s ${windDir(data.windDirection)}`} />
      <p className="text-xs text-gray-400 mt-auto pt-3">Obs. {obsAt}</p>
    </div>
  );
}
