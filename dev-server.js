/* Server lokal untuk pengembangan: menyajikan file statis + /api seperti di Vercel.
 * Jalankan: MONGODB_URI=... SESSION_SECRET=... DEV_AUTH=1 node dev-server.js */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const handler = require('./api/index.js');
const ROOT = __dirname, PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  if (u.pathname === '/api' || u.pathname === '/api/') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      req.query = u.query;
      try { req.body = body ? JSON.parse(body) : {}; } catch (e) { req.body = {}; }
      res.status = code => { res.statusCode = code; return res; };
      res.json = obj => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
      handler(req, res);
    });
    return;
  }
  const file = path.join(ROOT, path.normalize(u.pathname === '/' ? '/index.html' : u.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT) || file.includes(path.sep + 'api' + path.sep)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (e, data) => {
    if (e) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log('Dev server: http://localhost:' + PORT));
