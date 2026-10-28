# API cache and quota protection

All BallDontLie calls go through `src/lib/ballDontLie.ts`. Successful responses use Next's persistent Data Cache: games 30 seconds, schedule 300 seconds, active rosters and standings pages 3600 seconds. Spoiler filtering happens after reading cached game data; personalized responses remain private.

On a cache miss, a conditional Blob write reserves a call in `bdl-budget.json`. All routes and instances using the same store share a rolling limit of **5 calls per 60 seconds**, including failed upstream calls. No API key is written to Blob; only its SHA-256 identity is stored. This conservative limit works with the free plan. Calls from other applications using the same key are outside this budget.

A provider 429 pauses new upstream calls for at least 60 seconds, or its longer Retry-After value. A denied active-roster request (401/403) skips that endpoint for one hour across teams, using the existing ESPN fallback. Failed responses are not stored as successful cached data. Storage failures stop new upstream calls rather than bypassing quota checks.

The existing private Blob store (`BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`) is now required for BallDontLie requests as well as digest/highlight storage. Conditional writes use the existing ETag conflict/retry helper. This avoids an instance-local limiter that resets on every cold start. It adds Blob operations for reservations and cooldowns; at substantially higher traffic, use a transactional rate-limit store instead.

## Standings snapshot

Visitors only read the last complete `standings-cache.json` snapshot. `POST /api/standings`, authorized with the existing `DIGEST_PUBLISH_TOKEN`, processes one season page and persists its cursor. Incomplete or failed refreshes preserve the previous snapshot. The endpoint never publishes a truncated table.

The **Standings snapshot** GitHub workflow runs hourly at minute 40. It uses the existing repository Actions secret `DIGEST_PUBLISH_TOKEN`; no new secret is needed. The runner waits between pages, respects quota pauses and resumes saved progress. It stops on failure without deleting the last complete snapshot.

After deploying this change, manually run that workflow once, or wait for its first scheduled run. Until the first complete snapshot is published, standings returns 503 with Retry-After. The manual workflow must target a deployment containing the new POST endpoint. GitHub may delay scheduled runs; old snapshots remain available for the same season.

## Schedule recaps

Schedule requests recent finalized game dates in batches of up to 15 through the existing highlights endpoint. Calendar and agenda share the same results. Older or missing videos keep their YouTube search fallback. These requests read saved highlights, not the YouTube Data API.

## Checks

`tests/api-budget.test.mjs` checks shared-instance budgets, simultaneous misses, expiry, 429 cooldown, denied rosters, storage failure, parameter validation, snapshot publication and job retries using mocks. `tests/game-recap-link.test.mjs` checks 16 dates split into two batches. No test uses production credentials or provider quota.
