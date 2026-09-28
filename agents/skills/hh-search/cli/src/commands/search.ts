import {
  BASE_URL,
  authedJsonFetch,
  mapSearchResponse,
  resolveAreas,
  writeError,
  type VacancyCard,
  type HHSearchResponse,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location: string
  jobage?: number
  remote: boolean
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

const PER_PAGE = 20

// hh.ru's `area` param is a repeated-param OR filter (see url-reference.md) -
// one buildUrl call can cover several regions at once, e.g. --location
// "moscow,moscow-oblast,spb".
export function buildUrl(opts: SearchOpts, areas: string[]): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("text", opts.query)
  for (const area of areas) params.append("area", area)
  if (opts.jobage !== undefined) params.set("period", String(opts.jobage))
  if (opts.remote) params.set("schedule", "remote")
  params.set("page", String(opts.page - 1))
  params.set("per_page", String(PER_PAGE))
  return `${BASE_URL}/vacancies?${params.toString()}`
}

function renderTable(cards: VacancyCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 40).padEnd(40)
    const company = (c.company || "—").slice(0, 24).padEnd(24)
    const loc = (c.location || "—").slice(0, 16).padEnd(16)
    const salary = (c.salary || "—").slice(0, 20)
    return `${c.id.padEnd(11)} ${title} ${company} ${loc} ${salary}`
  })
  const header =
    "ID".padEnd(11) +
    " " +
    "TITLE".padEnd(40) +
    " " +
    "COMPANY".padEnd(24) +
    " " +
    "LOCATION".padEnd(16) +
    " SALARY"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  const areas = resolveAreas(opts.location)
  if (!areas) {
    writeError(
      `unrecognized --location "${opts.location}" - use one or more comma-separated known areas ` +
        `(moscow, moscow-oblast, spb, russia) or raw numeric hh.ru area ids from https://api.hh.ru/areas`,
      "BAD_LOCATION",
    )
    return 1
  }

  try {
    const data = await authedJsonFetch<HHSearchResponse>(buildUrl(opts, areas))
    let cards = mapSearchResponse(data)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.salary || "з/п не указана"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page, found: data.found }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
