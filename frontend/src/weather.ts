// Open-Meteo client — free, no API key.
// Fetches current temperature, wind, and weather code from the user's location.

export type WeatherSnapshot = {
  tempC: number;
  windKmh: number;
  code: number;
  label: string;   // localized (IT)
  emoji: string;   // matches code
  fetchedAt: number;
};

const BASE = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot | null> {
  try {
    const url = `${BASE}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const c = j?.current;
    if (!c) return null;
    const code = Number(c.weather_code ?? 0);
    const { label, emoji } = describeWmoCode(code);
    return {
      tempC: Math.round(Number(c.temperature_2m ?? 0)),
      windKmh: Math.round(Number(c.wind_speed_10m ?? 0)),
      code,
      label,
      emoji,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// WMO weather interpretation codes (Open-Meteo standard)
export function describeWmoCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Sereno', emoji: '☀️' };
  if (code === 1) return { label: 'Quasi sereno', emoji: '🌤️' };
  if (code === 2) return { label: 'Parzialmente nuvoloso', emoji: '⛅' };
  if (code === 3) return { label: 'Nuvoloso', emoji: '☁️' };
  if (code === 45 || code === 48) return { label: 'Nebbia', emoji: '🌫️' };
  if (code >= 51 && code <= 57) return { label: 'Pioviggine', emoji: '🌦️' };
  if (code >= 61 && code <= 67) return { label: 'Pioggia', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { label: 'Neve', emoji: '🌨️' };
  if (code >= 80 && code <= 82) return { label: 'Rovesci', emoji: '🌧️' };
  if (code >= 85 && code <= 86) return { label: 'Rovesci di neve', emoji: '❄️' };
  if (code >= 95 && code <= 99) return { label: 'Temporale', emoji: '⛈️' };
  return { label: '', emoji: '🌡️' };
}
