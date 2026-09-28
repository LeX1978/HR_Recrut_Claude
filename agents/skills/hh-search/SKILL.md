---
name: hh-search
version: 1.0.0
description: >
  Use this skill to search job vacancies on hh.ru (HeadHunter), the largest job
  board in Russia and the CIS. Invoke for Russian/CIS job search, vacancies,
  hiring, and job postings on hh.ru or "HeadHunter" - "вакансии", "поиск
  работы", "hh.ru". Location defaults to Moscow + Moscow Oblast + Saint
  Petersburg (the candidate's target on-site/hybrid regions - see
  job-scraper/search-queries.md's Location Filter) but accepts other known
  areas, a comma-separated list of several, or "Russia" for nationwide search
  (combine with --remote for remote-schedule postings regardless of area).
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/hh-search/cli/src/cli.ts *)
---

# hh.ru Search Skill

Search live job listings from hh.ru's official public JSON API (`api.hh.ru`). Built
for the Russian/CIS market (`source.md` in the "поиск-работы" project).

> Market-specific skill generated for this fork, following the `/add-portal` pattern
> documented in the repo README (`.agents/skills/linkedin-search` is the canonical
> zero-dependency reference this was built from). Not upstream-portable as-is.

## Setup (required before first use)

Unlike reference endpoints (`/areas`, `/dictionaries`), hh.ru's own docs
(<https://github.com/hhru/api>, `docs/vacancies.md` + the README's method badges) mark
vacancy search and detail (`GET /vacancies`) as requiring **application authorization**
(OAuth2 `client_credentials` grant), not anonymous access. A first attempt at this
skill (16-09-2026) assumed no auth was needed and got a `403 {"errors":[{"type":"forbidden"}]}`
on every `/vacancies` call - that 403 was this missing app token, not (as first
suspected) DDoS-Guard bot protection; see `url-reference.md` for the corrected notes.

1. Register an application at <https://dev.hh.ru/admin> (requires an hh.ru account).
   No `redirect_uri`/user OAuth flow is needed - this CLI uses `client_credentials`
   (app-only) auth, which the search/detail endpoints accept.
2. Copy the app's `client_id` and `client_secret` into a `.env` file at the **repo
   root** (`~/Projects/Рекрутер/.env`, gitignored, `chmod 600`):
   ```
   HH_CLIENT_ID=...
   HH_CLIENT_SECRET=...
   ```
3. Run any `search`/`detail` command - the CLI fetches an app token on first use and
   caches it to `.agents/skills/hh-search/cli/.token-cache.json` (gitignored). Per
   hh.ru's docs the token is meant to be generated once and reused (requesting a new
   one more than once per 5 minutes is itself rejected), so this cache is required
   behavior, not just an optimization.

**Verified end-to-end with a real app token (24-09-2026):** `search` (default areas and
`-l russia --remote`) and `detail` return live data. One value per line in `.env` - a
secret wrapped onto its own line leaves `HH_CLIENT_SECRET` empty and fails with the
"Missing HH_CLIENT_ID / HH_CLIENT_SECRET" error. If `search` ever 403s again, the
fallback is the `site:hh.ru` WebSearch queries in `job-scraper/search-queries.md`.

## When to use this skill

- Search job vacancies on hh.ru by keyword, area, and posting age
- Get the full description, key skills, salary, and requirements of a specific vacancy

## Commands

### Search vacancies

```bash
bun run .agents/skills/hh-search/cli/src/cli.ts search --query "<text>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` - keyword search (title, skill, role). Recommended.
- `--location <text>` / `-l <text>` - one or more comma-separated known areas below, or raw numeric hh.ru area ids (hh.ru ORs them together). Default: `moscow,moscow-oblast,spb`.
- `--jobage <days>` - posted within N days (hh.ru caps this at 30 server-side; a larger value is sent as-is and hh.ru silently applies its own cap).
- `--remote` - filter to remote-schedule vacancies only (hh.ru `schedule=remote`). **Combine with `-l russia`**, not the default location - hh.ru tags a remote posting with its employer's area, so restricting to Moscow/Moscow Oblast/SPb would silently drop remote roles from employers based elsewhere; see the second usage example below.
- `--page <n>` - 1-indexed page (hh.ru returns up to 100/page; this CLI requests 20/page).
- `--limit <n>` / `-n <n>` - cap results emitted (client-side).
- `--format json|table|plain` - default `json`.

**Known areas** (case-insensitive, RU or EN): `moscow`/`москва` (1), `moscow-oblast`/`московская область`/`подмосковье` (2019), `spb`/`saint-petersburg`/`санкт-петербург` (2), `russia`/`россия` (113, nationwide). Any other numeric hh.ru area id is accepted as-is; an unrecognized non-numeric location is rejected with a clear error rather than silently searching nationwide - look up the id at <https://api.hh.ru/areas> and pass it directly.

### Fetch full vacancy detail

```bash
bun run .agents/skills/hh-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric hh.ru vacancy id (e.g. `123456789`). A full `hh.ru/vacancy/<id>` URL also works. Returns the full description (HTML stripped to plain text), key skills, salary, experience level, schedule, and employment type.

## Usage examples

```bash
bun run src/cli.ts search -q "Agile coach" --jobage 14 --format table
bun run src/cli.ts search -q "Delivery Manager" -l russia --remote --format table
bun run src/cli.ts detail 123456789 --format plain
```

The candidate's location rule (see `job-scraper/search-queries.md`'s Location Filter) is
covered by **two separate calls**, since hh.ru applies `area` and `schedule` as an AND, not
an OR: the default (`moscow,moscow-oblast,spb`, any schedule) for on-site/hybrid roles, and
`-l russia --remote` for remote roles nationwide.

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default - programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single vacancy's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data source: hh.ru's official public API (`api.hh.ru/vacancies`), JSON. Requires an
  app token (`client_credentials` OAuth2) - see Setup above.
- `--jobage` maps to hh.ru's `period` parameter (days), capped at 30 by hh.ru itself.
- Salary, when present, is returned as a range with currency (hh.ru vacancies often omit it - a missing salary is normal, not a parsing failure).
- No commercial or bulk use beyond personal job search - this is the same personal-use posture as the other portal skills in this repo.
