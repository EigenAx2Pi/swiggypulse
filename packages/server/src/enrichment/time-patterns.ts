/**
 * Time-of-day demand modeling helpers. Pure functions over orders.
 * Currently used by the analyzer; surfaced separately so future enrichment
 * (event calendars, holidays) can plug in here without touching analyzer logic.
 */

export function bucketByHour<T>(items: T[], getDate: (item: T) => Date): Map<number, number> {
  const m = new Map<number, number>();
  for (const it of items) {
    const h = getDate(it).getHours();
    m.set(h, (m.get(h) ?? 0) + 1);
  }
  return m;
}

export function bucketByDow<T>(items: T[], getDate: (item: T) => Date): Map<number, number> {
  const m = new Map<number, number>();
  for (const it of items) {
    const d = getDate(it).getDay();
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

export function isPeakHour(hour: number): boolean {
  return hour >= 19 && hour <= 21;
}
