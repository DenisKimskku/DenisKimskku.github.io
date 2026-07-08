# deniskim1-ask — Cloudflare Worker for "Ask AI about this selection"

A Cloudflare Worker that proxies the site's "Ask AI about this selection"
feature to the NVIDIA NIM chat-completions API. It runs on the **same
origin** as the static site (`deniskim1.com/api/ask*`), so the browser never
needs CORS and the NVIDIA API key never leaves Cloudflare.

## Architecture

```
Browser (deniskim1.com article page)
  |  POST /api/ask            { selection, mode, question? }
  |  GET  /api/ask/quota      (no quota consumed)
  v
Cloudflare edge (zone deniskim1.com, already proxied)
  |  route: deniskim1.com/api/ask*  ->  Worker "deniskim1-ask"
  v
Worker
  |-- 1. Origin/Referer allowlist (exact origin match via new URL();
  |       blocks cross-site browser abuse only — headers are spoofable)
  |-- 2. Input validation (JSON, <=8 KB, selection 20..2000 chars, mode enum)
  |-- 3. RateLimiter Durable Object (SQLite-backed, free plan)
  |       * per-IP:  DAILY_LIMIT/day (UTC) + 8s minimum interval
  |       * global:  GLOBAL_DAILY_LIMIT/day across ALL users (instance 'global')
  |       * quota consumed BEFORE upstream; refunded on upstream 5xx/timeout
  |       * limiter down => 503 (fail closed, never skipped)
  |-- 4. POST https://integrate.api.nvidia.com/v1/chat/completions
  |       Authorization: Bearer NVIDIA_API_KEY   (Worker secret)
  |       fixed model + sampling params, single turn, stream: true
  v
SSE stream (text/event-stream) piped back to the browser
```

## Why the key cannot live in the static site

The site is a fully static export (Next.js `out/` on GitHub Pages). Anything
shipped in it — JS bundles, JSON, "obfuscated" strings — is world-readable,
and the NVIDIA key draws on a **paid credit pool**. Anyone could extract it
and drain the credits within hours. The only safe place is a server-side
secret, and since the zone is already proxied by Cloudflare, a Worker on the
same origin is the cheapest server we can have. Defense in depth on top of
the hidden key:

- **Rate limits are the primary abuse defense**: per-IP daily quota +
  8-second burst interval, and a global daily cap so distributed abuse
  can't drain the pool either. Quota is consumed before the upstream call
  and only refunded on upstream failures where nothing was streamed.
- Exact-origin allowlist (no substring matching — see the repo's earlier
  CodeQL URL-substring-sanitization fix). Note this is **not**
  authentication: Origin/Referer are trivially spoofable by non-browser
  clients (curl, scripts). It only stops other websites from calling the
  API through visitors' browsers (CSRF-style abuse); scripted callers get
  through it and are bounded by the rate limits above.
- Fixed model and sampling parameters; single-turn only (no chat history),
  so it can't be repurposed as a general chatbot.
- `workers_dev: false` — the routed domain is the only entry point.
- Terse error codes; upstream bodies/stack traces are never exposed.

## Endpoints

| Method | Path             | Description                                                        |
| ------ | ---------------- | ------------------------------------------------------------------ |
| POST   | `/api/ask`       | Body `{ selection, mode: 'explain'\|'summarize'\|'significance'\|'question', question? }`. Streams OpenAI-style SSE. |
| GET    | `/api/ask/quota` | `{ limit, remaining, resetAt }` for the caller's IP. Free (does not consume quota). |

Successful `/api/ask` responses carry `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. 429 bodies are
`{ error: 'rate_limited', scope: 'user'|'global', remaining, resetAt }`.
All responses set `Cache-Control: no-store` and
`X-Content-Type-Options: nosniff`.

## Required Cloudflare API-token permissions

Create a token at Cloudflare dashboard -> My Profile -> API Tokens ->
Create Token -> "Create Custom Token" with exactly:

- **Account -> Workers Scripts -> Edit**
- **Zone -> Workers Routes -> Edit** (zone: `deniskim1.com`)

Nothing more. Do not reuse a Global API Key.

## GitHub secrets (for `.github/workflows/deploy-worker.yml`)

Three repository secrets are required:

| Secret                  | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| `NVIDIA_API_KEY`        | The `nvapi-...` key from build.nvidia.com                     |
| `CLOUDFLARE_API_TOKEN`  | The custom token created above                                |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard -> Workers & Pages -> right sidebar      |

Via the `gh` CLI (each command prompts for the value; you can also pipe it —
never paste secrets into shell history or files):

```sh
gh secret set NVIDIA_API_KEY
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

Via the web UI: github.com -> your repo -> **Settings** ->
**Secrets and variables** -> **Actions** -> **New repository secret**.

The workflow triggers on pushes to `main` touching `cloudflare-worker/**`
(or itself), and can be run manually from the Actions tab
(`workflow_dispatch`). It deploys with `cloudflare/wrangler-action@v3` and
pushes `NVIDIA_API_KEY` as a Worker secret via the action's `secrets` input.

## Local development

```sh
cd cloudflare-worker
npm install
cp .dev.vars.example .dev.vars     # then put the real key in .dev.vars
npx wrangler dev --var DEV_MODE:1  # DEV_MODE=1 allows http://localhost:3000
```

`.dev.vars` is gitignored — never commit it. `wrangler dev` reads
`NVIDIA_API_KEY` from it automatically. With `DEV_MODE:1` the origin
allowlist additionally accepts `http://localhost:3000` so the Next.js dev
server can call the Worker.

Typecheck: `npm run check` (or `npx tsc --noEmit -p cloudflare-worker` from
the repo root).

## Changing limits or the model

Edit the `vars` block in `wrangler.jsonc` and redeploy:

- `DAILY_LIMIT` — successful asks per IP per UTC day (default `5`).
- `GLOBAL_DAILY_LIMIT` — asks per UTC day across all users (default `150`).
- `NVIDIA_MODEL` — upstream model id (default `meta/llama-3.3-70b-instruct`).
- `DEV_MODE` — keep `"0"` in production; only ever set `1` via
  `wrangler dev --var DEV_MODE:1`.

The 8-second per-IP interval, 60-second upstream timeout, and sampling
parameters (`temperature 0.3`, `top_p 0.9`, `max_tokens 600`) are constants
in `src/index.ts` — intentionally not client- or var-configurable.

## Future hardening

If scripted abuse (spoofed-origin clients burning the daily quotas) ever
becomes a problem, the next steps are:

- **Cloudflare Turnstile**: issue a token in the browser widget and verify
  it in the Worker per request — actually authenticates a real browsing
  session, which the Origin allowlist cannot.
- **A WAF / zone rate-limiting rule** on `deniskim1.com/api/ask*` — blocks
  high-volume callers at the edge before they reach the Worker or the
  Durable Object.

Neither is enabled today; the per-IP + global quotas are the current
backstop.

## Key hygiene

If the NVIDIA key was ever pasted into a chat, email, ticket, commit, or any
other insecure channel, **rotate it** at build.nvidia.com, then update the
`NVIDIA_API_KEY` GitHub secret and your local `.dev.vars`. Re-run the deploy
workflow so the Worker picks up the new secret.
