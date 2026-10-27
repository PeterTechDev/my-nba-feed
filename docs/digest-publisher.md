# Daily Digest publisher

The [Daily NBA Digest workflow](https://github.com/PeterTechDev/my-nba-feed/actions/workflows/digest.yml)
runs on GitHub-hosted Linux, daily at **11:00 UTC / 08:00 America/Bahia**. It does
not need a local computer, checkout, Codex session or ChatGPT subscription.
GitHub may delay scheduled jobs; this is a daily publishing schedule, not an exact
minute delivery guarantee.

## Credentials

Repository Actions secrets `OPENAI_API_KEY` and `DIGEST_PUBLISH_TOKEN` are exposed
only to the generation step on `main`. The publisher token must match Vercel's
production `DIGEST_PUBLISH_TOKEN`. The OpenAI key is for the owner's selected
Platform project; API usage is billed to that project. This key was created with
a one-year expiration on October 27, 2026: replace it before October 27, 2027.
Never commit env files, print either key or upload credential files as artifacts.

## Each run

1. `scripts/generate-digest.mjs` determines today's edition and yesterday's league
   date in `America/New_York`, independent of the runner timezone and DST.
2. If today's production edition exists, it skips generation and publication.
3. It reads yesterday's ESPN NBA scoreboard and production Celtics context. It
   rejects malformed feeds, unfinished games, duplicate events, unexpected dates
   and conflicting Celtics scores. Postponed/canceled games have no final score.
4. It asks OpenAI `gpt-5-mini` for a short analytical briefing using only the supplied
   facts, with strict JSON output, no tools and a 5,000-token output limit.
   A refusal, incomplete response, billing error or invalid payload stops publication.
5. Dates, matchup chips, margin statistics, source URLs and model metadata are
   derived by code. The model writes the title and briefing only. Source retrieval
   time is included in the published Sources section.
6. The existing publisher validates the payload, authenticates to the fixed HTTPS
   production endpoint, refuses redirects and confirms saved content by a fresh
   read. An uncertain write retries the same edition once without regenerating.

The workflow has one concurrency group, read-only repository permissions, pinned
actions and a 15-minute timeout. It never changes app code, My Teams, homepage or
Telegram integrations. Generation and publishing require no approval per edition.

## Manual verification and recovery

Use **Run workflow** on `main`, or `gh workflow run digest.yml --ref main`.
Completed runs link to the production Digest in their job summary. Check API latest,
date and archive views, then reveal the content in `/digest` and reload it to verify
persistence and spoiler protection. Do not submit artificial production reactions.

To deliberately regenerate today's edition, select `replace_today=true` on a manual
run. Only `workflow_dispatch` can enable this override; daily schedules preserve
existing editions. Replacing an edition preserves its date and aggregated reactions.
For a failed run, inspect Actions logs; no failure should be presented as an empty
successful edition. A 401 indicates a publisher-token mismatch. OpenAI
`insufficient_quota` or `credit_balance_exhausted` requires the owner to restore API
billing/credits; these errors stop immediately without repeated model requests.

For local debugging with Node 22.18+, supply the two variables through ignored env
files or the process environment, then use `npm run digest:generate`. A local run
cannot enable the manual cloud replacement override. Generated local JSON remains
under ignored `data/`; the hosted runner's temporary files are discarded after the job.

## Scheduler maintenance

GitHub automatically disables scheduled workflows in a public repository after
60 days without repository activity. Check the Actions workflow status and re-enable
it if GitHub disables it; there is no hidden keepalive commit. See
[GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
The previous local Codex automation should stay disabled after cloud verification,
so there is only one daily generator.
