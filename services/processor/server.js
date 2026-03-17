/**
 * Weather Processor Service
 * Calls the Collector, enriches data with computed metrics
 */
const http = require('http');

const PORT = process.env.PORT || 3002;
const raw = process.env.COLLECTOR_URL || 'https://collector-service-on1g.onrender.com';
const BASE = raw.startsWith('http') ? raw : `https://${raw}`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'weather-processor' }));
    return;
  }

  if (req.url?.startsWith('/weather') || req.url === '/') {
    const url = new URL(req.url, `http://localhost`);
    const city = url.searchParams.get('city') || url.searchParams.get('q') || 'London';

    try {
      const raw = await fetch(`${BASE}/weather?city=${encodeURIComponent(city)}`);
      const data = await raw.json();

      if (!raw.ok) {
        res.writeHead(raw.status);
        res.end(JSON.stringify(data));
        return;
      }

      // Enrich: add computed fields
      const tempC = data.temp ?? 0;
      const tempF = (tempC * 9) / 5 + 32;
      const condition = getConditionSummary(data.description);
      const advice = getWeatherAdvice(data);

      const enriched = {
        ...data,
        source: 'processor',
        temp_fahrenheit: Math.round(tempF * 10) / 10,
        condition_category: condition,
        advice,
        processed_at: new Date().toISOString()
      };

      res.writeHead(200);
      res.end(JSON.stringify(enriched));
    } catch (err) {
      res.writeHead(502);
      res.end(JSON.stringify({
        error: 'Failed to fetch from collector',
        details: err.message,
        collector_url: BASE
      }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

function getConditionSummary(desc) {
  if (!desc) return 'unknown';
  const d = desc.toLowerCase();
  if (d.includes('clear')) return 'clear';
  if (d.includes('cloud')) return 'cloudy';
  if (d.includes('rain') || d.includes('drizzle')) return 'rainy';
  if (d.includes('snow')) return 'snowy';
  if (d.includes('storm') || d.includes('thunder')) return 'stormy';
  if (d.includes('fog') || d.includes('mist')) return 'foggy';
  return 'partly_cloudy';
}

function getWeatherAdvice(data) {
  const temp = data.temp ?? 0;
  const wind = data.wind_speed ?? 0;
  const desc = (data.description || '').toLowerCase();
  const tips = [];

  if (temp > 30) tips.push('Stay hydrated and seek shade');
  else if (temp < 5) tips.push('Dress in layers and wear a coat');
  if (wind > 10) tips.push('Windy conditions – secure loose items');
  if (desc.includes('rain')) tips.push('Carry an umbrella');
  if (desc.includes('storm')) tips.push('Consider staying indoors');
  if (tips.length === 0) tips.push('Enjoy the weather');

  return tips;
}

server.listen(PORT, () => {
  console.log(`Weather Processor running on port ${PORT} (collector: ${BASE})`);
});
