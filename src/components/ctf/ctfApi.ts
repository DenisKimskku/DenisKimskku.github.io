/**
 * Single transport + session layer for every CTF call.
 *
 * Previously each component rolled its own fetch: the terminal sent
 * `X-Session-ID` and never set `credentials`, while the certificate and
 * writeups panels did the opposite (`credentials: 'include'`, no header, their
 * own hardcoded URL). They only resolved to the same server-side session by
 * accident, via the backend's IP-hash fallback — so a player who finished all
 * 20 levels and came back on a different network saw "0/20 Solved".
 *
 * One code path, one session, one error type.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_CTF_BACKEND_URL || 'https://ctf-api.deniskim1.com';

const SESSION_KEY = 'ctf_session_id';

// In-RAM mirror: Safari Private Mode and partitioned storage can throw on
// localStorage access, and the session should still survive within the tab.
let memorySession: string | null = null;
let sessionReady: Promise<string | null> | null = null;

export function readSessionId(): string | null {
  if (memorySession) return memorySession;
  if (typeof window === 'undefined') return null;
  try {
    memorySession = window.localStorage.getItem(SESSION_KEY);
  } catch {
    /* storage blocked — stays null until /api/status answers */
  }
  return memorySession;
}

export function writeSessionId(id: string): void {
  if (!id) return;
  memorySession = id;
  // Restoring a resume code must not be overridden by an in-flight bootstrap
  // that is still resolving the old session.
  sessionReady = Promise.resolve(id);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* private mode: the in-RAM mirror keeps this tab coherent */
  }
}

/**
 * First-visit session race.
 *
 * Every endpoint that calls get_request_session MINTS a session when the caller
 * presents none. On a first visit localStorage is empty and the arena fires
 * /api/status, /api/level and /api/hint within a few milliseconds of each
 * other, so each one created its OWN session -- observed in production as two
 * rows written in the same second from one page load. The IP+User-Agent
 * fallback used to hide this by collapsing them; removing that fallback (it
 * shared flag_seed between strangers behind a NAT) exposed it.
 *
 * It is not merely untidy: /api/level returns is_completed for a session the UI
 * then discards, and /api/hint records an attempt against it, so the hint
 * counter a player sees can belong to a session that no longer exists.
 *
 * Fix it once, in the transport: the first caller to need a session performs
 * /api/status and everyone else awaits that same promise. Any future component
 * gets this for free.
 */

async function ensureSession(signal?: AbortSignal): Promise<string | null> {
  const existing = readSessionId();
  if (existing) return existing;
  if (!sessionReady) {
    sessionReady = ctfFetch('/api/status', { signal, timeoutMs: 15_000, __bootstrap: true })
      .then((r) => r.json())
      .then((d: StatusData) => {
        if (d?.session_id) writeSessionId(d.session_id);
        return d?.session_id ?? null;
      })
      .catch(() => {
        // Let the next caller retry rather than caching a failure for the tab.
        sessionReady = null;
        return null;
      });
  }
  return sessionReady;
}

export type ApiErrorKind =
  | 'rate_limit'
  | 'busy'
  | 'forbidden'
  | 'not_found'
  | 'server'
  | 'offline'
  | 'timeout'
  | 'aborted'
  | 'http';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly kind: ApiErrorKind,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function classify(status: number): ApiErrorKind {
  if (status === 429) return 'rate_limit';
  if (status === 503) return 'busy';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'http';
}

async function detailOf(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* non-JSON body (a Cloudflare error page, for instance) */
  }
  return `HTTP ${res.status}`;
}

interface ApiOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Internal: the /api/status call that establishes the session. Must not
   *  await ensureSession, or it would deadlock on itself. */
  __bootstrap?: boolean;
}

export async function ctfFetch(path: string, opts: ApiOptions = {}): Promise<Response> {
  const { method = 'GET', body, signal, timeoutMs = 60_000, __bootstrap = false } = opts;

  // Serialise session creation. Without this, concurrent first-visit calls each
  // mint their own session server-side.
  if (!__bootstrap) await ensureSession(signal);

  const headers: Record<string, string> = {};
  // Content-Type is not CORS-safelisted; setting it on a bodyless GET forces an
  // OPTIONS preflight on every status/level/hint call for nothing.
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // The header is the PRIMARY session carrier: third-party cookies to
  // ctf-api.deniskim1.com are blocked by default in Safari.
  const sid = readSessionId();
  if (sid) headers['X-Session-ID'] = sid;

  const ctl = new AbortController();
  const onOuterAbort = () =>
    ctl.abort(signal?.reason ?? new DOMException('aborted', 'AbortError'));
  signal?.addEventListener('abort', onOuterAbort, { once: true });
  const timer = setTimeout(
    () => ctl.abort(new DOMException('timeout', 'TimeoutError')),
    timeoutMs,
  );

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
    // NEVER retry here. /api/chat and /api/submit_flag are non-idempotent: the
    // old fallback loop replayed the POST against the next host on any non-2xx,
    // double-charging the rate limiter and double-counting the attempt (which
    // silently burned the player's hint budget).
    if (!res.ok) {
      const retryAfter = Number(res.headers.get('retry-after')) || undefined;
      throw new ApiError(res.status, await detailOf(res), classify(res.status), retryAfter);
    }
    return res;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const name = (e as DOMException)?.name;
    if (name === 'TimeoutError') throw new ApiError(0, 'The arena did not answer in time.', 'timeout');
    if (name === 'AbortError') throw new ApiError(0, 'Cancelled.', 'aborted');
    throw new ApiError(0, 'Cannot reach the CTF arena.', 'offline');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

export interface StatusData {
  session_id: string;
  user_id: string;
  current_level: number;
  completed_levels: number[];
  total_levels: number;
}

export async function fetchStatus(signal?: AbortSignal): Promise<StatusData> {
  const res = await ctfFetch('/api/status', { signal, timeoutMs: 15_000 });
  const data = (await res.json()) as StatusData;
  if (data?.session_id) writeSessionId(data.session_id);
  return data;
}

/**
 * Drop the server-side conversation for one level.
 *
 * POST /api/chat/clear {level}. Progress is untouched by design: solved levels,
 * captured flags, and the attempt counters that gate hints are all unreachable
 * from that endpoint, and flag_seed is never regenerated (a flag the player
 * already wrote down must keep verifying).
 *
 * A failure is surfaced by the caller as "cleared locally only" rather than
 * reported as success — telling a player the model forgot when it did not would
 * break the level.
 */
export async function clearConversation(level: number, signal?: AbortSignal): Promise<void> {
  await ctfFetch('/api/chat/clear', {
    method: 'POST',
    body: { level },
    signal,
    timeoutMs: 15_000,
  });
}

export interface StreamEvent {
  chunk?: string;
  replace?: boolean;
  status?: string;
  win?: boolean;
  judge_reason?: string;
  unlocked_flag?: string;
  engine_error?: boolean;
  guardrail_blocked?: boolean;
  done?: boolean;
  /** How many stored messages the server replayed into this turn, and the size
   *  of that window. Absent on levels with no conversation. */
  turns_retained?: number;
  context_window?: number;
}

/**
 * Parse ONE SSE record (the text between blank-line separators).
 * Handles multi-line `data:` fields, `:` keep-alive comments, `event:`/`id:`
 * fields we ignore, and non-JSON payloads.
 */
function parseSseRecord(record: string): StreamEvent | null {
  const dataLines: string[] = [];
  for (const line of record.split(/\r\n|\n|\r/)) {
    if (line === '' || line.startsWith(':')) continue; // blank / keep-alive
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    if (field !== 'data') continue;
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1); // spec: strip ONE space
    dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  const payload = dataLines.join('\n');
  if (payload === '[DONE]') return { done: true };
  try {
    return JSON.parse(payload) as StreamEvent;
  } catch {
    return { chunk: payload }; // bare string -> show it, don't drop the stream
  }
}

/**
 * POST /api/chat/stream with an incremental parser that survives chunk
 * boundaries splitting a `data:` line mid-JSON — the classic bug in naive
 * `split('\n') + JSON.parse` implementations.
 *
 * Resolves with the terminal (done:true) event; rejects if the stream drops
 * before the judge returned a verdict.
 */
export async function streamChat(
  level: number,
  prompt: string,
  onChunk: (text: string, replace: boolean) => void,
  opts: {
    signal?: AbortSignal;
    idleTimeoutMs?: number;
    /** Every parsed record, including ones with no chunk. The backend's only
     *  progress signal on a buffered level is {"chunk": "", "status":
     *  "generating"} and "" is falsy — which is why `status` was unreachable. */
    onEvent?: (ev: StreamEvent) => void;
  } = {},
): Promise<StreamEvent> {
  const idleTimeoutMs = opts.idleTimeoutMs ?? 90_000;

  const res = await ctfFetch('/api/chat/stream', {
    method: 'POST',
    body: { level, prompt },
    signal: opts.signal,
    timeoutMs: idleTimeoutMs,
  });
  if (!res.body) throw new ApiError(0, 'Streaming is unsupported in this browser.', 'server');

  const reader = res.body.getReader();
  // {stream:true} on EVERY decode: level 5 is explicitly the multilingual
  // challenge and the model emits CJK freely; a 3-byte UTF-8 sequence split
  // across a network chunk decodes to U+FFFD without it.
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let final: StreamEvent | null = null;
  let idle: ReturnType<typeof setTimeout> | undefined;

  // IDLE timeout, not a total budget: a slow but progressing generation must
  // not be killed.
  const armIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(
      () => void reader.cancel(new DOMException('idle', 'TimeoutError')),
      idleTimeoutMs,
    );
  };
  const onOuterAbort = () => void reader.cancel(opts.signal?.reason);
  opts.signal?.addEventListener('abort', onOuterAbort, { once: true });

  const drain = (flush: boolean) => {
    for (;;) {
      const m = /\r\n\r\n|\n\n|\r\r/.exec(buffer); // SSE records end at a BLANK LINE
      if (!m) break; // partial record: wait for more bytes
      const record = buffer.slice(0, m.index);
      buffer = buffer.slice(m.index + m[0].length);
      const ev = parseSseRecord(record);
      if (!ev) continue;
      opts.onEvent?.(ev);
      if (ev.chunk) onChunk(ev.chunk, !!ev.replace);
      if (ev.done) final = ev;
    }
    if (flush && buffer.trim() !== '') {
      // Some proxies drop the trailing blank line on close.
      const ev = parseSseRecord(buffer);
      buffer = '';
      if (ev) {
        opts.onEvent?.(ev);
        if (ev.chunk) onChunk(ev.chunk, !!ev.replace);
        if (ev.done) final = ev;
      }
    }
  };

  try {
    armIdle();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      armIdle();
      buffer += decoder.decode(value, { stream: true });
      drain(false); // several events may arrive in ONE read
    }
    buffer += decoder.decode();
    drain(true);
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === 'TimeoutError') throw new ApiError(0, 'The model stopped responding mid-answer.', 'timeout');
    if (name === 'AbortError') throw new ApiError(0, 'Cancelled.', 'aborted');
    throw new ApiError(0, 'The connection to the arena dropped.', 'offline');
  } finally {
    clearTimeout(idle);
    opts.signal?.removeEventListener('abort', onOuterAbort);
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  if (!final) {
    // Ended without done:true — a backend restart, a tunnel flap, or a timeout.
    // NEVER render this as a loss; the judge never ran.
    throw new ApiError(
      0,
      'The connection dropped before the judge returned a verdict — your attempt was not scored. Send it again.',
      'server',
    );
  }
  return final;
}

/** Human-readable copy for an ApiError, shown directly to the player. */
export function describeError(e: ApiError, level?: number): string {
  switch (e.kind) {
    case 'rate_limit':
      return 'Rate limit reached (10 prompts/minute). Wait about a minute — retrying now will not go through.';
    case 'busy':
      // The backend yields to the voice assistant and the nightly pipeline.
      return e.message || 'The GPU is serving a higher-priority workload on this machine. Retry shortly.';
    case 'timeout':
      return 'The model did not respond in time. The arena runs on a single local machine; try again in a moment.';
    case 'offline':
      return 'Cannot reach the CTF arena. The backend may be restarting — your progress is saved server-side.';
    case 'not_found':
      return `Level ${level ?? ''} was not found on the server.`.trim();
    case 'forbidden':
      return e.message;
    default:
      return e.message;
  }
}
