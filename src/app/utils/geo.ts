/** Haversine distance in km between two GPS coordinates */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Road-adjusted distance (campus roads ≈ 1.35× straight line) */
export function campusDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversine(lat1, lon1, lat2, lon2) * 1.35;
}

/** Format distance nicely */
export function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Walking time in minutes (4.5 km/h) */
export function walkTime(km: number): number {
  return Math.round((km / 4.5) * 60);
}

/** Cycling time in minutes (12 km/h) */
export function cycleTime(km: number): number {
  return Math.round((km / 12) * 60);
}

/** Auto time in minutes (20 km/h campus speed) + wait */
export function autoTime(km: number, waitMin = 3): number {
  return Math.round((km / 20) * 60) + waitMin;
}

/** Walking time in SECONDS (4.5 km/h) */
export function walkTimeSeconds(km: number): number {
  return Math.round((km / 4.5) * 3600);
}

/** Cycling time in SECONDS (12 km/h) */
export function cycleTimeSeconds(km: number): number {
  return Math.round((km / 12) * 3600);
}

/** Auto time in SECONDS (20 km/h) + 3 min wait */
export function autoTimeSeconds(km: number, waitSec = 180): number {
  return Math.round((km / 20) * 3600) + waitSec;
}

/** Format seconds to "X h Y min Z sec" precisely */
export function formatTimeExact(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h} h ${m} min ${s} sec`;
  if (m > 0) return `${m} min ${s} sec`;
  return `${s} sec`;
}

/** Calories burned walking (kcal) */
export function walkCalories(km: number): number {
  return Math.round(km * 65);
}

/** Calories burned cycling (kcal) */
export function cycleCalories(km: number): number {
  return Math.round(km * 38);
}

/** CO₂ saved vs petrol auto (kg) */
export function co2Saved(km: number): number {
  return Math.round(km * 0.12 * 100) / 100;
}

/** Auto fare in INR (₹) */
export function autoFare(km: number): number {
  return Math.max(15, Math.round(km * 8));
}

/** Format minutes as "X min" or "X h Y min" */
export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Generate route waypoints between two points (slightly curved) */
export function generateRoutePoints(
  from: [number, number],
  to: [number, number],
  numIntermediates = 4
): [number, number][] {
  const result: [number, number][] = [from];
  for (let i = 1; i <= numIntermediates; i++) {
    const t = i / (numIntermediates + 1);
    const lat = from[0] + (to[0] - from[0]) * t;
    const lng = from[1] + (to[1] - from[1]) * t;
    const curveFactor = Math.sin(t * Math.PI) * 0.00035;
    const dlat = to[0] - from[0];
    const dlng = to[1] - from[1];
    // Perpendicular offset for road-like curve
    result.push([lat - dlng * curveFactor, lng + dlat * curveFactor]);
  }
  result.push(to);
  return result;
}