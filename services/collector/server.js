/**
 * Weather Collector Service
 * Fetches raw weather data from OpenWeatherMap API
 * Exposes internal /weather endpoint for other services
 */
const http = require('http');

const PORT = process.env.PORT || 3001;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'weather-collector' }));
    return;
  }

  if (req.url?.startsWith('/weather') || req.url === '/') {
    const url = new URL(req.url, `http://localhost`);
    const city = url.searchParams.get('city') || url.searchParams.get('q') || 'London';

    if (!OPENWEATHER_API_KEY) {
      res.writeHead(503);
      res.end(JSON.stringify({
        error: 'OPENWEATHER_API_KEY not configured',
        hint: 'Set OPENWEATHER_API_KEY env var (free at openweathermap.org)'
      }));
      return;
    }

    try {
      const raw = await fetch(
        `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      const data = await raw.json();

      if (data.cod !== 200) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: data.message || 'City not found' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        source: 'collector',
        city: data.name,
        country: data.sys?.country,
        temp: data.main?.temp,
        feels_like: data.main?.feels_like,
        humidity: data.main?.humidity,
        pressure: data.main?.pressure,
        wind_speed: data.wind?.speed,
        description: data.weather?.[0]?.description,
        icon: data.weather?.[0]?.icon,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Failed to fetch weather', details: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Weather Collector running on port ${PORT}`);
});
