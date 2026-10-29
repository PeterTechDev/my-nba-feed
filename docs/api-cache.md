# API cache and quota protection

Visitors read a shared, saved league catalog through `src/lib/leagueSnapshot.ts`.
Team changes, calendar ranges and score reveals filter that catalog locally.
Only the authenticated sync and the league-wide live refresh call BallDontLie.

| Data | External refresh | Shared storage/cache |
|---|---|---|
| Games, schedule and records | 06:35, 14:35, 22:35 America/Bahia | Redis catalog; Next cache 1 hour, invalidated after publication |
| Live scores | At most once per minute while visitors request games in the 12-hour start window | Redis lease across instances, Next cache 60 seconds |
| Rosters | ESPN, daily per requested team | Next cache 24 hours; CDN 1 hour |
| News | Hourly per requested feed | Next cache 1 hour; personalized responses stay private |
| Highlights and top plays | Existing hourly YouTube job | Redis; shared read cache and CDN 5 minutes |

The first catalog contained 3,358 games: 34 provider requests per sync, or about
102 daily for three runs, plus live updates. This changes with pagination.
Requests are spaced 16 seconds apart, and all source calls share a rolling limit
of 5 calls per 60 seconds. A 429 honors Retry-After across routes and instances.
Only the API key's SHA-256 identity is stored with quota timestamps.

A complete, validated catalog replaces the previous version atomically. Failed
syncs keep the old catalog; failed live refreshes retain saved scores. Browser
retries honor Retry-After and retain successful data through transient errors.
A Redis failure stops new provider calls rather than bypassing quota protection.

`KV_REST_API_URL` and `KV_REST_API_TOKEN` configure Redis. `documentStorage.ts`
uses compare-and-swap Lua to prevent concurrent updates from overwriting each
other. No Blob operations remain. Keep Free and automatic upgrades disabled.
[Upstash Free](https://upstash.com/pricing/redis) currently includes 500K monthly
commands and 10 GB bandwidth. The projected catalog is about 1.1 MB; the hourly
cache avoids downloading it every minute. Cold caches, multiple regions and
other traffic still affect usage. Free hosting is not unlimited capacity.

GitHub schedules may run late. The existing YouTube workflow renews both schedules
before GitHub's inactivity cutoff. Inspect NBA Games Sync failures in Actions;
provider calls emit `balldontlie_request` logs with path/status, never credentials.

## Spoiler boundaries

The private, non-cacheable responses from `/api/games` and `/api/news` apply spoiler filtering after source data is read. Their header and reveal contract is documented in [README.md](../README.md#spoiler-api). `/api/games/live` and `/api/schedule` return results without this redaction; their consumers must apply the appropriate viewing controls.

Digest and standings pages, APIs and publication jobs have been removed. Existing historical Blob documents are untouched. The retained `DIGEST_PUBLISH_TOKEN` name now authenticates the highlights and game publishers.

## Schedule recaps

Schedule requests recent finalized game dates in batches of up to 15 through the existing highlights endpoint. Calendar and agenda share the same results. Older or missing videos keep their YouTube search fallback. These requests read saved highlights, not the YouTube Data API.

## Checks

`tests/api-budget.test.mjs` checks shared-instance budgets, simultaneous misses, expiry, 429 cooldown, denied rosters, storage failure, parameter validation using mocks. `tests/game-recap-link.test.mjs` checks 16 dates split into two batches. No test uses production credentials or provider quota.
