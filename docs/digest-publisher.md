# Daily Digest publisher

The [Daily NBA Digest workflow](https://github.com/PeterTechDev/my-nba-feed/actions/workflows/digest.yml)
runs on GitHub-hosted Linux, daily at **11:00 UTC / 08:00 America/Bahia**. It does
not need a local computer, checkout, Codex session or ChatGPT subscription.
GitHub may delay scheduled jobs; this is a daily publishing schedule, not an exact
minute delivery guarantee.

## Credentials

Only `DIGEST_PUBLISH_TOKEN` is needed as a repository Actions secret, exposed to the
publication step on `main`. It must match Vercel's production publisher token.
No OpenAI key or paid inference API is used; the unused OpenAI Actions secret was
removed. Never commit env files, print the token or upload credential files.

## Free inference

Qwen2.5-7B-Instruct (Apache-2.0), quantized Q4_K_M, runs on the standard GitHub
Ubuntu 24.04 runner's CPU through llama.cpp. Inference listens only on
`127.0.0.1:8080`; no prompt or credential is sent to a model provider.
The workflow pins the runtime release and model revision, checks both SHA-256
hashes, and discards the temporary model/server after the job. No model weights
are committed or uploaded as artifacts. The roughly 4.7 GB model download happens
inside the cloud runner, not on the owner's computer.

[Standard Actions runners are free for public repositories](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
This depends on the repository remaining public and using a standard runner.
Validation rejects malformed/incomplete outputs, while matchup scores, margin
statistics and source references come from code.

## Each run

1. `scripts/generate-digest.mjs` determines today's edition and yesterday's league
   date in `America/New_York`, independent of the runner timezone and DST.
2. If today's production edition exists, it skips generation and publication.
3. It reads yesterday's ESPN NBA scoreboard and production Celtics context. It
   rejects malformed feeds, unfinished games, duplicate events, unexpected dates
   and conflicting Celtics scores. Postponed/canceled games have no final score.
4. It asks the runner's Qwen model for a short analytical briefing using only the
   supplied facts, with schema-constrained JSON, no tools and a 1,200-token limit.
   An incomplete response or invalid payload stops publication.
5. Dates, matchup chips, margin statistics, source URLs and model metadata are
   derived by code. The model writes the title and briefing only. Source retrieval
   time is included in the published Sources section.
6. The existing publisher validates the payload, authenticates to the fixed HTTPS
   production endpoint, refuses redirects and confirms saved content by a fresh
   read. An uncertain write retries the same edition once without regenerating.

The publishing job has read-only repository permissions, pinned actions and a
15-minute timeout. A separate maintenance job has only `actions: write` for renewing
workflow activation; it does not check out or execute repository code. Both share
one concurrency group. The workflow never changes app code, My Teams, homepage or
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
successful edition. A 401 indicates a publisher-token mismatch. A failed model
download, checksum mismatch or inference failure stops the job without publishing.

For local debugging with Node 22.18+, start the same model server and supply the
publisher token through an ignored env file, then use `npm run digest:generate`. A local run
cannot enable the manual cloud replacement override. Generated local JSON remains
under ignored `data/`; the hosted runner's temporary files are discarded after the job.

## Scheduler maintenance

The independent `keep-schedule-active` job preemptively re-enables `digest.yml`
through GitHub's supported workflow activation API on every daily or manual run.
This renews activation before the 60-day inactivity deadline, even when there are
no human commits. It follows the API-based
[workflow keepalive approach](https://github.com/liskin/gh-workflow-keepalive).
It uses only the job's short-lived `GITHUB_TOKEN` with `actions: write`; publishing
retains read-only permissions. No personal token, paid service, dummy commit,
repository write or additional deployment is needed.

The maintenance job runs independently of publication and verifies `state=active`
after the API call. Source/model failures therefore do not prevent renewal. Renewal
errors fail the job visibly rather than being ignored. Manual disabling of Actions
or removal of repository access still requires owner intervention; this maintenance
does not override an owner's deliberate stop.

The previous local Codex automation **Publicar Phantom Digest** is disabled
(PAUSED) after cloud verification on October 27, 2026. There is one active daily
generator, hosted by GitHub.

## Production verification

[Cloud run on October 27, 2026](https://github.com/PeterTechDev/my-nba-feed/actions/runs/40508335180)
completed generation, authenticated publication and fresh read verification in
1 minute 49 seconds. The published edition identifies Qwen2.5-7B-Instruct and covers
the nine completed games on October 26. Browser verification passed 24 checks,
including spoilers, reload persistence, date/archive reads, four viewport sizes,
axe accessibility, My Teams identities and retained favorites. No production test
reactions were submitted. The next scheduled daily trigger was not awaited.
