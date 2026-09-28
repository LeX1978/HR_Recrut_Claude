// Data source: hh.ru's official public JSON API (api.hh.ru). Per the official
// docs (https://github.com/hhru/api/blob/master/docs/vacancies.md and the
// README's method badges), GET /vacancies (search and detail) requires
// *application* authorization (OAuth2 client_credentials grant) - it is not
// an anonymous endpoint, unlike /areas or /dictionaries. See ../url-reference.md
// for the investigation notes: this is what the 403 on /vacancies was.

import { fileURLToPath } from "node:url"

export const BASE_URL = "https://api.hh.ru"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "hh-search-cli/1.0 (personal job search, ai-job-search fork)"

/** Thrown when hh.ru rejects a request for an auth-related reason (missing/invalid/expired app token). */
export class HHAuthError extends Error {}

/** Fetch JSON with exponential backoff on 429/5xx. Throws on a 404 or other error. */
export async function jsonFetch<T>(url: string, token?: string): Promise<T> {
  const maxRetries = 6
  let delay = 500
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "application/json",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) {
      throw new Error("Not found (404)")
    }
    if (response.status === 403) {
      const body = await response.text()
      throw new HHAuthError(`Request failed: 403 Forbidden ${body}`)
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as T
  }
  throw new Error("Request failed after max retries")
}

// Cached next to this file (not the repo root, so it survives regardless of
// the cwd `bun run` is invoked from) - gitignored, see .gitignore.
// fileURLToPath, not URL.pathname: pathname keeps non-ASCII path segments
// percent-encoded (this repo lives under ~/Projects/Рекрутер), which silently
// wrote the cache to a sibling "%D0%A0..." directory outside the repo.
export const TOKEN_CACHE_PATH = fileURLToPath(new URL("../.token-cache.json", import.meta.url))

async function readCachedToken(): Promise<string | null> {
  try {
    const file = Bun.file(TOKEN_CACHE_PATH)
    if (!(await file.exists())) return null
    const data = (await file.json()) as { access_token?: string }
    return data.access_token ?? null
  } catch {
    return null
  }
}

async function writeCachedToken(token: string): Promise<void> {
  await Bun.write(TOKEN_CACHE_PATH, JSON.stringify({ access_token: token }, null, 2) + "\n")
}

/**
 * Get an hh.ru *application* access token (OAuth2 client_credentials grant -
 * see https://github.com/hhru/api/blob/master/docs/authorization_for_application.md).
 * Requires HH_CLIENT_ID / HH_CLIENT_SECRET from a registered app at
 * https://dev.hh.ru/admin (see SKILL.md "Setup"). Per hh.ru's own docs this
 * token should be generated once and reused - requesting a new one more than
 * once per 5 minutes is rejected (403 "app token refresh too early"), and the
 * client_credentials token itself does not expire on its own - so it is
 * cached to disk rather than re-fetched on every CLI invocation (each is a
 * fresh process).
 */
export async function getAppToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = await readCachedToken()
    if (cached) return cached
  }
  const clientId = process.env.HH_CLIENT_ID
  const clientSecret = process.env.HH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new HHAuthError(
      "Missing HH_CLIENT_ID / HH_CLIENT_SECRET. Register an application at " +
        "https://dev.hh.ru/admin (no redirect_uri flow needed - this CLI uses the " +
        "client_credentials grant) and set both in a .env file at the repo root. " +
        "See SKILL.md's Setup section.",
    )
  }
  const response = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new HHAuthError(`Failed to obtain hh.ru app token: ${response.status} ${response.statusText} ${body}`)
  }
  const data = (await response.json()) as { access_token: string }
  await writeCachedToken(data.access_token)
  return data.access_token
}

/**
 * jsonFetch with an hh.ru app token attached. On an auth-related failure
 * (e.g. a cached token was revoked), forces one fresh token fetch and retries
 * once before giving up - never loops, since a second failure means the
 * problem isn't the token (see HHAuthError call sites for what those are).
 */
export async function authedJsonFetch<T>(url: string): Promise<T> {
  const token = await getAppToken()
  try {
    return await jsonFetch<T>(url, token)
  } catch (e) {
    if (!(e instanceof HHAuthError)) throw e
    const fresh = await getAppToken(true)
    return await jsonFetch<T>(url, fresh)
  }
}

// Known area ids, per SKILL.md's "Known areas" table. Extend here (and in
// SKILL.md) if more markets are needed - the full tree is at GET /areas.
// Ids verified 16-09-2026 against the live /areas tree (an anonymous endpoint).
const KNOWN_AREAS: Record<string, string> = {
  moscow: "1",
  "москва": "1",
  "moscow-oblast": "2019",
  "moscow region": "2019",
  "московская область": "2019",
  "подмосковье": "2019",
  spb: "2",
  "saint-petersburg": "2",
  "санкт-петербург": "2",
  russia: "113",
  "россия": "113",
}

/**
 * Resolve a single --location value to an hh.ru area id. Accepts a known
 * city/country name (case-insensitive, RU or EN) or a raw numeric id. Returns
 * null for an unrecognized non-numeric value - callers must treat that as a
 * hard error, never a silent nationwide fallback (a discarded location filter
 * changes what the search returns with no error).
 */
export function resolveArea(location: string): string | null {
  const trimmed = location.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  return KNOWN_AREAS[trimmed.toLowerCase()] ?? null
}

/**
 * Resolve a comma-separated --location value to one or more hh.ru area ids
 * (hh.ru's /vacancies accepts a repeated `area` param as an OR filter - see
 * url-reference.md). Returns null if *any* entry is unrecognized, for the
 * same reason resolveArea does: a partially-applied location filter should
 * never fail silently.
 */
export function resolveAreas(location: string): string[] | null {
  const parts = location.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
  if (parts.length === 0) return null
  const areas: string[] = []
  for (const part of parts) {
    const area = resolveArea(part)
    if (area === null) return null
    areas.push(area)
  }
  return areas
}

export interface VacancyCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  salary: string | null
}

export interface VacancyDetail extends VacancyCard {
  description: string | null
  keySkills: string[]
  experience: string | null
  schedule: string | null
  employment: string | null
}

interface HHSalary {
  from: number | null
  to: number | null
  currency: string | null
}

interface HHVacancyItem {
  id: string
  name: string
  employer?: { name?: string | null } | null
  area?: { name?: string | null } | null
  published_at?: string | null
  alternate_url?: string | null
  salary?: HHSalary | null
}

export interface HHSearchResponse {
  found: number
  page: number
  pages: number
  items: HHVacancyItem[]
}

export interface HHVacancyDetailResponse extends HHVacancyItem {
  description?: string | null
  key_skills?: Array<{ name: string }> | null
  experience?: { name?: string | null } | null
  schedule?: { name?: string | null } | null
  employment?: { name?: string | null } | null
}

function formatSalary(salary: HHSalary | null | undefined): string | null {
  if (!salary) return null
  const currency = salary.currency ?? ""
  if (salary.from && salary.to) return `${salary.from}-${salary.to} ${currency}`.trim()
  if (salary.from) return `от ${salary.from} ${currency}`.trim()
  if (salary.to) return `до ${salary.to} ${currency}`.trim()
  return null
}

export function mapSearchResponse(data: HHSearchResponse): VacancyCard[] {
  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.name,
    company: item.employer?.name ?? null,
    location: item.area?.name ?? null,
    date: item.published_at ?? null,
    url: item.alternate_url ?? `https://hh.ru/vacancy/${item.id}`,
    salary: formatSalary(item.salary),
  }))
}

/** Strip HTML tags from hh.ru's description field (basic <p>/<br>/<ul> markup only). */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function mapDetailResponse(data: HHVacancyDetailResponse): VacancyDetail {
  return {
    id: data.id,
    title: data.name,
    company: data.employer?.name ?? null,
    location: data.area?.name ?? null,
    date: data.published_at ?? null,
    url: data.alternate_url ?? `https://hh.ru/vacancy/${data.id}`,
    salary: formatSalary(data.salary),
    description: data.description ? stripHtml(data.description) : null,
    keySkills: (data.key_skills ?? []).map((s) => s.name),
    experience: data.experience?.name ?? null,
    schedule: data.schedule?.name ?? null,
    employment: data.employment?.name ?? null,
  }
}

/** Parse a numeric vacancy id out of a raw id or a full hh.ru vacancy URL. */
export function normalizeId(input: string): string | null {
  const bare = input.match(/^\d+$/)
  if (bare) return input
  const url = input.match(/vacancy\/(\d+)/)
  if (url) return url[1]
  return null
}
