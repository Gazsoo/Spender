import type { SensorDto } from '../../api/model';
import { tempTone, shortTime, useCountUp } from './weather';

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">{label}</span>
      <span className="text-base font-medium tabular-nums text-white/90">{value}</span>
    </div>
  );
}

export default function HeroReading({ sensor }: { sensor: SensorDto | null | undefined }) {
  const temp = sensor?.temperatureCompensated ?? NaN;
  const animated = useCountUp(temp);
  const tone = tempTone(Number.isFinite(temp) ? temp : 18);

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-[#0F1620] p-7 sm:p-9 text-white shadow-sm"
      style={{ ['--tone' as string]: tone.base, ['--glow' as string]: tone.glow }}
    >
      {/* temperature-tinted bloom */}
      <div
        aria-hidden
        className="home-breathe pointer-events-none absolute -right-16 -top-24 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${tone.glow}55 0%, transparent 70%)` }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
          In-room · Budapest XI
        </p>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ background: `${tone.base}26`, color: tone.glow }}
        >
          {tone.label}
        </span>
      </div>

      {!sensor ? (
        <p className="relative mt-10 text-sm text-white/40">Waiting for the first reading…</p>
      ) : (
        <>
          <div className="relative mt-5 flex items-start leading-none">
            <span
              className="font-display font-extrabold leading-none tracking-tight tabular-nums"
              style={{ fontSize: 'clamp(3.75rem, 9vw, 6rem)', color: tone.glow }}
            >
              {animated.toFixed(1)}
            </span>
            <span className="mt-1 ml-0.5 font-display text-2xl font-bold leading-none text-white/45 sm:text-3xl">°</span>
          </div>

          <p className="relative mt-4 text-sm text-white/55">
            Feels like{' '}
            <span className="font-semibold text-white/85 tabular-nums">{sensor.feelsLike.toFixed(1)}°</span>
          </p>

          <div className="relative mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            <Readout label="Humidity" value={`${sensor.humidity.toFixed(0)}%`} />
            <Readout label="Dew point" value={`${sensor.dewPoint.toFixed(1)}°`} />
            <Readout label="Pressure" value={`${sensor.pressure.toFixed(0)} hPa`} />
          </div>

          <p className="relative mt-5 text-[11px] text-white/35">Updated {shortTime(sensor.recordedAt)}</p>
        </>
      )}
    </section>
  );
}
