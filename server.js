const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);

let clients = [];

// Broadcast reload signal to all connected browsers
function notifyClients() {
  console.log(`[LiveServer] Cambio detectado. Notificando a ${clients.length} cliente(s)...`);
  clients.forEach(client => {
    try {
      client.write(`data: reload\n\n`);
    } catch (e) {}
  });
}

// Watch directory for changes (with debounce)
let fsTimeout;
fs.watch(ROOT, { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js'))) {
    if (!fsTimeout) {
      fsTimeout = setTimeout(() => {
        fsTimeout = null;
        notifyClients();
      }, 100);
    }
  }
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Handle SSE live reload endpoint
  if (req.url === '/__live_reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    clients.push(res);

    req.on('close', () => {
      clients = clients.filter(c => c !== res);
    });
    return;
  }

  // Parse file path
  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/') {
    parsedUrl = '/index.html';
  } else if (parsedUrl === '/investigacion' || parsedUrl === '/investigacion/') {
    parsedUrl = '/investigacion/index.html';
  } else if (parsedUrl === '/fichas-medicas' || parsedUrl === '/fichas-medicas/') {
    parsedUrl = '/fichas-medicas/index.html';
  }

  let filePath = path.join(ROOT, decodeURIComponent(parsedUrl));

  // Check if path is directory and has index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 No Encontrado</h1><p><a href="/">Ir al Hub de Mockups</a></p>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error leyendo archivo');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor Live Reload Activo`);
  console.log(`🏠 Hub Principal:       http://localhost:${PORT}/`);
  console.log(`🔬 Investigación:       http://localhost:${PORT}/investigacion/`);
  console.log(`🩺 Fichas Médicas:      http://localhost:${PORT}/fichas-medicas/`);
  console.log(`📡 Escuchando cambios en tiempo real en ${ROOT}`);
  console.log(`====================================================`);
});
