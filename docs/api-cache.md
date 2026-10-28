# API cache and quota protection

All BallDontLie calls go through `src/lib/ballDontLie.ts`. Successful responses use Next's persistent Data Cache: games 30 seconds, schedule 300 seconds, active rosters 3600 seconds. Spoiler filtering happens after reading cached game data; personalized responses remain private.

On a cache miss, a conditional Blob write reserves a call in `bdl-budget.json`. All routes and instances using the same store share a rolling limit of **5 calls per 60 seconds**, including failed upstream calls. No API key is written to Blob; only its SHA-256 identity is stored. This conservative limit works with the free plan. Calls from other applications using the same key are outside this budget.

A provider 429 pauses new upstream calls for at least 60 seconds, or its longer Retry-After value. A denied active-roster request (401/403) skips that endpoint for one hour across teams, using the existing ESPN fallback. Failed responses are not stored as successful cached data. Storage failures stop new upstream calls rather than bypassing quota checks.

The private Blob store (`BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`) is required for BallDontLie requests and highlight storage. For local development, use a read/write token for the connected private store; the store ID alone does not supply local credentials. Conditional writes use the ETag conflict/retry helper in `src/lib/blobStorage.ts`. This avoids an instance-local limiter that resets on every cold start. It adds Blob operations for reservations and cooldowns; at substantially higher traffic, use a transactional rate-limit store instead.

## Spoiler boundaries

The private, non-cacheable responses from `/api/games` and `/api/news` apply spoiler filtering after source data is read. Their header and reveal contract is documented in [README.md](../README.md#spoiler-api). `/api/games/live` and `/api/schedule` return results without this redaction; their consumers must apply the appropriate viewing controls.

Digest and standings pages, APIs and publication jobs have been removed. Existing historical Blob documents are untouched. The retained `DIGEST_PUBLISH_TOKEN` name now authenticates only the highlights publisher.

## Schedule recaps

Schedule requests recent finalized game dates in batches of up to 15 through the existing highlights endpoint. Calendar and agenda share the same results. Older or missing videos keep their YouTube search fallback. These requests read saved highlights, not the YouTube Data API.

## Checks

`tests/api-budget.test.mjs` checks shared-instance budgets, simultaneous misses, expiry, 429 cooldown, denied rosters, storage failure, parameter validation using mocks. `tests/game-recap-link.test.mjs` checks 16 dates split into two batches. No test uses production credentials or provider quota.
