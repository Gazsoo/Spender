import { useHome } from '../../hooks/useHome';
import HeroReading from './HeroReading';
import ConsensusPanel from './ConsensusPanel';
import WindowAdvice from './WindowAdvice';
import ForecastStrip from './ForecastStrip';
import StationCard from './StationCard';
import ModelCard from './ModelCard';

export default function HomePage() {
  const { data, isError } = useHome();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {isError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-600">
          Connection lost — showing the last reading we have.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HeroReading sensor={data?.sensor} />
        </div>
        <div className="lg:col-span-5">
          <ConsensusPanel data={data} />
        </div>
      </div>

      <WindowAdvice data={data} />

      <ForecastStrip forecast={data?.openMeteo?.forecast} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StationCard data={data?.hungaromet} />
        <ModelCard data={data?.openMeteo} />
      </div>
    </div>
  );
}
