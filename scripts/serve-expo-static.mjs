import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'apps/mobile/dist-qa');
const port = Number.parseInt(process.argv[3] ?? '8081', 10);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function staysInsideRoot(path) {
  return path === root || path.startsWith(`${root}${sep}`);
}

async function resolveRequestPath(pathname) {
  const decoded = decodeURIComponent(pathname).replaceAll('\\', '/');
  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const directPath = resolve(root, relativePath);

  if (!staysInsideRoot(directPath)) return null;
  if (await isFile(directPath)) return directPath;

  if (!extname(relativePath)) {
    const htmlPath = `${directPath}.html`;
    if (await isFile(htmlPath)) return htmlPath;

    const indexPath = join(directPath, 'index.html');
    if (await isFile(indexPath)) return indexPath;

    const segments = relativePath.split('/').filter(Boolean);
    const parentPath = resolve(root, ...segments.slice(0, -1));
    if (staysInsideRoot(parentPath)) {
      try {
        const dynamicRoute = (await readdir(parentPath)).find((name) =>
          /^\[[^\]]+\]\.html$/.test(name),
        );
        if (dynamicRoute) return join(parentPath, dynamicRoute);
      } catch {
        // A missing route directory falls through to the exported not-found page.
      }
    }
  }

  const spaEntryPath = join(root, 'index.html');
  if (await isFile(spaEntryPath)) return spaEntryPath;

  const notFoundPath = join(root, '+not-found.html');
  return (await isFile(notFoundPath)) ? notFoundPath : null;
}

createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const filePath = await resolveRequestPath(requestUrl.pathname);

  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(filePath.endsWith('+not-found.html') ? 404 : 200, {
    'cache-control': 'no-store',
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, 'localhost', () => {
  process.stdout.write(`Expo static QA server: http://localhost:${port}\n`);
});
