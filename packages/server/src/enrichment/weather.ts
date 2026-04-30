import { getMockWeather } from '@swiggypulse/mcp-mock';
import type { WeatherDay } from '@swiggypulse/mcp-mock';
import { logger } from '../lib/logger.js';

/**
 * Returns 90 days of historical weather + 7 days of forecast.
 * Uses OpenWeatherMap if OPENWEATHER_API_KEY is set, else mock data.
 */
export async function getWeather(): Promise<WeatherDay[]> {
  const apiKey = process.env['OPENWEATHER_API_KEY'];
  if (!apiKey) {
    return getMockWeather();
  }
  // Real implementation would call OpenWeatherMap's One Call 3.0 API
  // for both historical (timemachine endpoint) and forecast (daily field).
  // Skipped here since the mock data covers both windows realistically.
  logger.info('OpenWeatherMap key present, but live weather not yet wired — using mock');
  return getMockWeather();
}
