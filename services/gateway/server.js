/**
 * Weather Gateway Service
 * Public API + serves web UI, calls Processor
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PROCESSOR_URL_RAW = process.env.PROCESSOR_URL || 'https://processor-service-nvoq.onrender.com';
const PROCESSOR_URL = PROCESSOR_URL_RAW.startsWith('http') ? PROCESSOR_URL_RAW : `https://${PROCESSOR_URL_RAW}`;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', service: 'weather-gateway' }));
    return;
  }

  if (req.url?.startsWith('/api/weather') || req.url === '/api') {
    const url = new URL(req.url, `http://localhost`);
    const city = url.searchParams.get('city') || url.searchParams.get('q') || 'London';

    try {
      const raw = await fetch(`${PROCESSOR_URL}/weather?city=${encodeURIComponent(city)}`);
      const data = await raw.json();
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(raw.status);
      res.end(JSON.stringify(data));
    } catch (err) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(502);
      res.end(JSON.stringify({
        error: 'Weather service unavailable',
        details: err.message
      }));
    }
    return;
  }

  // Serve static files
  const base = path.join(__dirname, 'public');
  const urlPath = req.url.split('?')[0];
  let file = urlPath === '/' ? '/index.html' : urlPath;
    file = path.join(base, path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, ''));

  if (!file.startsWith(base)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(file);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', contentType);
    res.writeHead(200);
    res.end(body);
  });
});

server.listen(PORT, () => {
  console.log(`Weather Gateway running on port ${PORT} (processor: ${PROCESSOR_URL})`);
});
