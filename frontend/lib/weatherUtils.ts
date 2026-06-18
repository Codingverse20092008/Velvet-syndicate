export interface WeatherData {
  temp: number       // Celsius
  city: string       // Display label
  lat: number
  lon: number
}

/** Temperature tiers for the Joto Gorom Toto Char event */
export const HEAT_TIERS = [
  { minTemp: 44, label: 'Meltdown',  emoji: '🌋', xp: 100, coins: 50,  crate: null, hp: 5 },
  { minTemp: 41, label: 'Inferno',   emoji: '🔥', xp: 75,  coins: 25,  crate: 'mystery' as const, hp: 3 },
  { minTemp: 38, label: 'Heatwave',  emoji: '☀️',  xp: 50,  coins: 10,  crate: null, hp: 2 },
  { minTemp: 35, label: 'Scorcher',  emoji: '🌡️', xp: 25,  coins: 5,   crate: null, hp: 1 },
  { minTemp: 0,  label: 'Chill Zone',emoji: '❄️',  xp: 0,   coins: 0,   crate: null, hp: 0 },
] as const

export type HeatTier = typeof HEAT_TIERS[number]

export function getHeatTier(temp: number): HeatTier {
  return HEAT_TIERS.find((t) => temp >= t.minTemp) ?? HEAT_TIERS[HEAT_TIERS.length - 1]
}

/** Fraction (0–1) of progress toward the next tier, for the thermometer fill. */
export function tierProgress(temp: number): number {
  const tierIndex = HEAT_TIERS.findIndex((t) => temp >= t.minTemp)
  if (tierIndex <= 0) return 1 // already at max or below baseline

  const current = HEAT_TIERS[tierIndex]
  const next = HEAT_TIERS[tierIndex - 1]
  const range = next.minTemp - current.minTemp
  const within = temp - current.minTemp
  return Math.min(within / range, 1)
}

/** Overall fill of the thermometer from 0 (0°C) to 1 (50°C). */
export function thermometerFill(temp: number): number {
  return Math.min(Math.max(temp / 50, 0), 1)
}

/** Fetch weather via browser geolocation + Open-Meteo (no API key). */
export async function fetchWeather(): Promise<WeatherData> {
  const coords = await getCoords()
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&temperature_unit=celsius`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Weather fetch failed')
  const json = await res.json()
  const temp: number = Math.round(json.current_weather.temperature)
  return { temp, city: coords.city, lat: coords.lat, lon: coords.lon }
}

function getCoords(): Promise<{ lat: number; lon: number; city: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      // Default: Kolkata (hot Indian city, fitting for a Bengali-named event)
      resolve({ lat: 22.5726, lon: 88.3639, city: 'Kolkata' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: parseFloat(pos.coords.latitude.toFixed(4)),
          lon: parseFloat(pos.coords.longitude.toFixed(4)),
          city: 'Your City',
        })
      },
      () => {
        // Permission denied — fallback
        resolve({ lat: 22.5726, lon: 88.3639, city: 'Kolkata' })
      },
      { timeout: 5000 }
    )
  })
}
