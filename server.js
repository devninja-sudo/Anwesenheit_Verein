const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3000;

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

app.disable('x-powered-by');

app.use(express.static(distDir, { maxAge: '1h' }));
app.use(express.static(publicDir, { maxAge: '1h' }));

app.get('/impressum.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 'impressum.html'));
});

app.get('/datenschutz.html', (_req, res) => {
  res.sendFile(path.join(publicDir, 'datenschutz.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend web server listening on port ${port}`);
});
