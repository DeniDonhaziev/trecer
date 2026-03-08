// Простой сервер для LevelUp. Без зависимостей — только встроенные модули Node.js.
// Запуск: npm run dev  или  node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = path.join(__dirname, file.split('?')[0]);
  fs.readFile(file, (err, data) => {
    if (err) {
      if (file.endsWith('.html') || !path.extname(file)) {
        fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
          if (e) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(d);
        });
        return;
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  let ip = 'localhost';
  for (const n of Object.values(os.networkInterfaces())) {
    const a = n.find(x => x.family === 'IPv4' && !x.internal);
    if (a) { ip = a.address; break; }
  }
  console.log('\n  LevelUp доступен:\n');
  console.log('  http://localhost:' + PORT);
  console.log('  http://' + ip + ':' + PORT + '  (для телефона в Wi‑Fi)\n');
});
