const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 80;
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

const contentTypes = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, filePath) {
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end('Not Found');
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, {
			'Content-Type': contentTypes[ext] || 'application/octet-stream',
			'Cache-Control': 'public, max-age=3600',
		});
		res.end(data);
	});
}

const server = http.createServer((req, res) => {
	const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);

	if (!fs.existsSync(path.join(distDir, 'index.html'))) {
		res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
		res.end('Missing dist/index.html. Run `npm run build:web` and deploy the dist folder.');
		return;
	}

	if (requestPath === '/impressum.html') {
		return sendFile(res, path.join(publicDir, 'impressum.html'));
	}

	if (requestPath === '/datenschutz.html') {
		return sendFile(res, path.join(publicDir, 'datenschutz.html'));
	}

	const distTarget = path.join(distDir, requestPath === '/' ? 'index.html' : requestPath);
	if (distTarget.startsWith(distDir) && fs.existsSync(distTarget) && fs.statSync(distTarget).isFile()) {
		return sendFile(res, distTarget);
	}

	const publicTarget = path.join(publicDir, requestPath);
	if (publicTarget.startsWith(publicDir) && fs.existsSync(publicTarget) && fs.statSync(publicTarget).isFile()) {
		return sendFile(res, publicTarget);
	}

	return sendFile(res, path.join(distDir, 'index.html'));
});

server.listen(port, () => {
	console.log(`Frontend Passenger server listening on port ${port}`);
});
