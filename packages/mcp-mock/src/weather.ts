import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WeatherDay } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

let _weather: WeatherDay[] | null = null;
export function getMockWeather(): WeatherDay[] {
  if (_weather) return _weather;
  const raw = readFileSync(join(DATA_DIR, 'weather.json'), 'utf-8');
  _weather = JSON.parse(raw) as WeatherDay[];
  return _weather;
}
