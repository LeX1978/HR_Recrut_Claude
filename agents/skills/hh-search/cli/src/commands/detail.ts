import {
  BASE_URL,
  authedJsonFetch,
  mapDetailResponse,
  normalizeId,
  writeError,
  type HHVacancyDetailResponse,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a vacancy id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const data = await authedJsonFetch<HHVacancyDetailResponse>(`${BASE_URL}/vacancies/${id}`)
    const vacancy = mapDetailResponse(data)

    if (opts.format === "plain") {
      const lines = [
        vacancy.title,
        `${vacancy.company || "—"} · ${vacancy.location || "—"}`,
        vacancy.salary ? `Зарплата: ${vacancy.salary}` : "",
        vacancy.experience ? `Опыт: ${vacancy.experience}` : "",
        vacancy.employment ? `Занятость: ${vacancy.employment}` : "",
        vacancy.schedule ? `График: ${vacancy.schedule}` : "",
        vacancy.keySkills.length ? `Ключевые навыки: ${vacancy.keySkills.join(", ")}` : "",
        "",
        vacancy.description || "(нет описания)",
        "",
        `URL: ${vacancy.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(vacancy, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
