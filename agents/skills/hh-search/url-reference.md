# hh.ru (HeadHunter) API Reference

Official public JSON API, documented at <https://github.com/hhru/api> and
<https://api.hh.ru/openapi/redoc>. Vacancy search/detail require an app token
(OAuth2 `client_credentials` grant) - see SKILL.md's Setup section. Reference
endpoints like `/areas` and `/dictionaries` are anonymous.

## Investigation notes (16-09-2026, corrected)

- `robots.txt` on `hh.ru` (the website) does not cover `api.hh.ru` (a separate host) and
  does not disallow anything the API touches - it governs the HTML site's crawl surface
  (auth pages, resumes, account pages), not the documented API.
- `GET https://api.hh.ru/areas/1` and `GET https://api.hh.ru/dictionaries` returned `200`
  from this development machine.
- `GET https://api.hh.ru/vacancies?text=...` returned `403 {"errors":[{"type":"forbidden"}]}`
  from the same machine, with and without a descriptive `User-Agent`. **First
  interpreted as DDoS-Guard IP blocking - that was wrong.** The README's method badges
  (`docs/vacancies.md` in the `hhru/api` repo) mark `GET /vacancies` (search and detail)
  as requiring application authorization (`client` badge), unlike `/areas`/`/dictionaries`
  (`anon` badge). The plain `{"type":"forbidden"}` body with no `value` doesn't match any
  of the documented OAuth error cases in `docs/errors.md` either (those all carry
  `"type":"oauth"` with a `value`), consistent with it being the generic "no
  authorization at all" rejection on a protected endpoint rather than a bot-protection
  block. **Confirmed 24-09-2026:** with a real app token, `/vacancies`
  search and detail return 200 - the 403 was the missing token, not DDoS-Guard.
- App token flow, per `docs/authorization_for_application.md` and the OpenAPI spec's
  `/token` operation: `POST https://api.hh.ru/token` (form-urlencoded) with
  `grant_type=client_credentials`, `client_id`, `client_secret` (from a registered app
  at <https://dev.hh.ru/admin>) returns `{"access_token": "...", "token_type": "bearer"}`
  - no `expires_in`/`refresh_token` for this grant. Docs say to generate it once and
  reuse it; re-requesting more than once per 5 minutes gets `403 {"type":"forbidden","value":"app token refresh too early"}`.
  Use it as `Authorization: Bearer <access_token>` on subsequent requests.

## Search

```
GET https://api.hh.ru/vacancies
```

Query params used by this CLI:

| Param | Meaning | Example |
|-------|---------|---------|
| `text` | Free-text query (title, skill, company) | `Agile coach` |
| `area` | hh.ru area id (see Known areas in SKILL.md, or `GET /areas` for the full tree). **Repeatable** - hh.ru ORs multiple `area` params together (per the OpenAPI spec: "Можно указать несколько значений") | `1` (Moscow), or `area=1&area=2019&area=2` for Moscow+Oblast+SPb |
| `period` | Posted within N days (hh.ru caps at 30) | `14` |
| `schedule` | Work schedule filter | `remote` |
| `page` | 0-indexed page | `0` |
| `per_page` | Results per page (this CLI uses 20) | `20` |

Response shape (relevant fields):

```json
{
  "found": 1234,
  "page": 0,
  "pages": 62,
  "items": [
    {
      "id": "123456789",
      "name": "Agile coach",
      "employer": { "name": "Acme" },
      "area": { "name": "Москва" },
      "published_at": "2026-09-10T12:00:00+0300",
      "alternate_url": "https://hh.ru/vacancy/123456789",
      "salary": { "from": 200000, "to": null, "currency": "RUR" }
    }
  ]
}
```

## Detail

```
GET https://api.hh.ru/vacancies/<id>
```

Adds (over the search item): `description` (HTML), `key_skills` (array of `{name}`),
`experience.name`, `schedule.name`, `employment.name`. `description` is stripped of HTML
tags by this CLI's `stripHtml` helper before display.

## Notes

- Requires an app token (see above) plus a descriptive `User-Agent`
  (e.g. `hh-search-cli/1.0 (contact-email)`) - see their API README.
- Rate limiting: hh.ru returns `403`/`429` under abuse; this CLI backs off with the same
  exponential-backoff pattern as the other portal CLIs in this repo.
- `period` (job age) is capped at 30 days server-side by hh.ru itself - requesting more
  does not error, hh.ru just applies its own ceiling.
