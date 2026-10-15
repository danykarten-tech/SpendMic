type RequestLike = { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ResponseLike;
  json: (body: unknown) => unknown;
  end: () => unknown;
};

const attempts = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_ACTIVATIONS_PER_WINDOW = 10;

function header(request: RequestLike, name: string): string | undefined {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

/** Same-origin requests need no CORS header. Cross-origin use is opt-in. */
export function applyCors(request: RequestLike & { method?: string }, response: ResponseLike, methods: string): boolean {
  const origin = header(request, 'origin');
  const configuredOrigin = process.env.SPENDMIC_ALLOWED_ORIGIN;
  const host = header(request, 'x-forwarded-host') || header(request, 'host');
  const protocol = (header(request, 'x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
  const sameOrigin = host ? `${protocol}://${host}` : undefined;
  const allowedOrigin = configuredOrigin || sameOrigin;

  if (origin && origin !== allowedOrigin) {
    response.status(403).json({ authorized: false, message: 'Cross-origin licensing requests are not allowed.' });
    return false;
  }

  // A same-origin browser request does not need ACAO. Emit it only for an
  // explicitly configured cross-origin deployment.
  if (origin && configuredOrigin && origin === configuredOrigin) {
    response.setHeader('Access-Control-Allow-Origin', configuredOrigin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', methods);
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return false;
  }
  return true;
}

/** Best-effort serverless throttling. Production deployments should also use provider WAF limits. */
export function allowActivationAttempt(request: RequestLike): boolean {
  const forwardedFor = header(request, 'x-forwarded-for');
  const clientAddress = forwardedFor?.split(',')[0]?.trim() || request.socket?.remoteAddress || 'unknown';
  const bucket = clientAddress;
  const now = Date.now();
  const recent = (attempts.get(bucket) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_ACTIVATIONS_PER_WINDOW) {
    attempts.set(bucket, recent);
    return false;
  }
  recent.push(now);
  attempts.set(bucket, recent);
  return true;
}

export function isSafeDeviceName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 120;
}
