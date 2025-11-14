import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LED3 indicator helper for Water Level container distance thresholds.
// Assumption: input is the distance from sensor to water surface in centimeters.
// Mapping:
//  - <= 16 cm  => green (safe/high level)
//  - 17–19.99 cm => orange (warning)
//  - >= 20 cm => red (critical/low level)
export type Led3Color = 'green' | 'orange' | 'red';

export function getLed3Color(distanceCm: number | null | undefined): Led3Color | null {
  if (distanceCm == null || Number.isNaN(Number(distanceCm))) return null;
  const d = Number(distanceCm);
  if (d <= 16) return 'green';
  if (d < 20) return 'orange';
  return 'red'; // d >= 20
}

export function led3ColorToBg(led: Led3Color | null): string {
  switch (led) {
    case 'green':
      return 'bg-emerald-500';
    case 'orange':
      return 'bg-amber-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}
