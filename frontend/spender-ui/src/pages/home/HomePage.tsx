import { useHome } from '../../hooks/useHome';
import SensorCard from './SensorCard';
import HungarometCard from './HungarometCard';
import OpenMeteoCard from './OpenMeteoCard';
import ForecastStrip from './ForecastStrip';

export default function HomePage() {
  const { data, isError } = useHome();

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          Connection lost — showing last known data.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <SensorCard sensor={data?.sensor} />
        <HungarometCard data={data?.hungaromet} />
        <OpenMeteoCard data={data?.openMeteo} />
      </div>

      <ForecastStrip forecast={data?.openMeteo?.forecast} />
    </div>
  );
}
