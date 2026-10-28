# Team logos

The 30 official primary SVGs were saved from the NBA CDN on October 27, 2026:

`https://cdn.nba.com/logos/nba/{nbaComId}/primary/L/logo.svg`

Filenames retain the NBA.com team IDs mapped in `src/lib/teams.ts`. Serve these
files locally so logo rendering does not depend on browser access to that CDN.
When a team changes its identity, replace its SVG from the official source and
check that it renders on both dark and team-colored backgrounds.

Team names and logos belong to their respective owners.
