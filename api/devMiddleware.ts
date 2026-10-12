import type { Plugin } from 'vite';
import activateHandler from './license/activate';
import verifyHandler from './license/verify';
import replaceHandler from './license/replace';
import statusHandler from './license/status';

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/license/')) {
          return next();
        }

        // Polyfill res.status and res.json for serverless handler compatibility
        const wrappedRes: any = res;
        wrappedRes.status = (code: number) => {
          res.statusCode = code;
          return wrappedRes;
        };
        wrappedRes.json = (data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return wrappedRes;
        };

        // Extract query parameters
        const urlObj = new URL(req.url, 'http://localhost');
        const query: Record<string, string> = {};
        urlObj.searchParams.forEach((v, k) => {
          query[k] = v;
        });
        (req as any).query = query;

        // Parse JSON body if present
        let bodyBuffer = '';
        req.on('data', (chunk) => {
          bodyBuffer += chunk;
        });

        req.on('end', async () => {
          if (bodyBuffer) {
            try {
              (req as any).body = JSON.parse(bodyBuffer);
            } catch {
              (req as any).body = {};
            }
          } else {
            (req as any).body = {};
          }

          try {
            const pathname = urlObj.pathname;
            if (pathname === '/api/license/activate') {
              await activateHandler(req, wrappedRes);
            } else if (pathname === '/api/license/verify') {
              await verifyHandler(req, wrappedRes);
            } else if (pathname === '/api/license/replace') {
              await replaceHandler(req, wrappedRes);
            } else if (pathname === '/api/license/status') {
              await statusHandler(req, wrappedRes);
            } else {
              wrappedRes.status(404).json({ message: 'API route not found' });
            }
          } catch (err: any) {
            wrappedRes.status(500).json({ error: err?.message || 'Server error' });
          }
        });
      });
    },
  };
}
