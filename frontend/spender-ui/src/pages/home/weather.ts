import { useEffect, useRef, useState } from 'react';
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudSnow, CloudLightning, type LucideIcon,
} from 'lucide-react';

/** A temperature band: the page's accent *is* the reading. */
export interface TempTone {
  base: string;   // solid accent
  glow: string;   // brighter, for radial bloom
  label: string;  // plain-language descriptor
}

export function tempTone(t: number): TempTone {
  if (t <= 0)  return { base: '#5B8DEF', glow: '#7AA8FF', label: 'freezing' };
  if (t < 8)   return { base: '#39A6C9', glow: '#5BD0EC', label: 'cold' };
  if (t < 15)  return { base: '#2BB7A4', glow: '#46DCC6', label: 'cool' };
  if (t < 22)  return { base: '#5FB95F', glow: '#7FD97F', label: 'mild' };
  if (t < 27)  return { base: '#E6B137', glow: '#FFCD56', label: 'warm' };
  if (t < 32)  return { base: '#E6843A', glow: '#FF9E54', label: 'hot' };
  return { base: '#DE5039', glow: '#FF6F52', label: 'scorching' };
}

export interface WeatherInfo {
  Icon: LucideIcon;
  label: string;
}

export function weatherInfo(code: number): WeatherInfo {
  if (code === 0) return { Icon: Sun, label: 'Clear' };
  if (code <= 2)  return { Icon: CloudSun, label: 'Partly cloudy' };
  if (code === 3) return { Icon: Cloud, label: 'Overcast' };
  if (code <= 49) return { Icon: CloudFog, label: 'Fog' };
  if (code <= 59) return { Icon: CloudDrizzle, label: 'Drizzle' };
  if (code <= 69) return { Icon: CloudRain, label: 'Rain' };
  if (code <= 79) return { Icon: CloudSnow, label: 'Snow' };
  if (code <= 84) return { Icon: CloudRain, label: 'Showers' };
  if (code <= 86) return { Icon: CloudSnow, label: 'Snow showers' };
  return { Icon: CloudLightning, label: 'Thunderstorm' };
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function windDir(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16];
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

/** Dew point from temperature + relative humidity (Magnus formula). */
export function dewPoint(tempC: number, rh: number): number {
  const a = 17.625, b = 243.04;
  const g = Math.log(Math.max(1, Math.min(100, rh)) / 100) + (a * tempC) / (b + tempC);
  return (b * g) / (a - g);
}

export type WindowMode = 'open' | 'closed' | 'neutral';

export interface WindowAdvice {
  mode: WindowMode;
  delta: number;        // inside − outside, °C (positive = warmer indoors)
  headline: string;
  detail: string;
  caveat?: string;
}

/**
 * Should you open the window to cool the flat? Opening helps when it's
 * cooler outside; it backfires when it's warmer. Flags when outdoor air
 * is noticeably muggier (higher dew point) so you don't trade heat for damp.
 */
export function windowAdvice(args: {
  inTemp: number; inDew: number; outTemp: number; outRh: number;
}): WindowAdvice {
  const { inTemp, inDew, outTemp, outRh } = args;
  const delta = inTemp - outTemp;
  const outDew = dewPoint(outTemp, outRh);
  const muggier = outDew - inDew > 2;
  const dewNote = `Outdoor air is muggier — dew point ${outDew.toFixed(0)}° vs ${inDew.toFixed(0)}° inside.`;

  if (delta > 1) {
    return {
      mode: 'open',
      delta,
      headline: 'Open the windows',
      detail: `It's ${delta.toFixed(1)}° cooler outside — airing out will draw the heat off.`,
      caveat: muggier ? dewNote : undefined,
    };
  }
  if (delta < -1) {
    return {
      mode: 'closed',
      delta,
      headline: 'Keep the windows shut',
      detail: `It's ${Math.abs(delta).toFixed(1)}° warmer outside — opening up would heat the flat.`,
    };
  }
  return {
    mode: 'neutral',
    delta,
    headline: 'No need either way',
    detail: `Only ${Math.abs(delta).toFixed(1)}° between inside and out — opening won't shift much.`,
    caveat: muggier ? dewNote : undefined,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Eases a displayed number toward `target` — an instrument settling.
 * First mount rises from a small offset; later refetches glide from the
 * previous value. Honours prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 950): number {
  const [val, setVal] = useState(target);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (prefersReducedMotion()) {
      setVal(target);
      prevRef.current = target;
      return;
    }
    const from = prevRef.current ?? target - 4;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}
