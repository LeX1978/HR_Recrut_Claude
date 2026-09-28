import { describe, test, expect } from "bun:test";
import {
  resolveArea,
  resolveAreas,
  stripHtml,
  mapSearchResponse,
  mapDetailResponse,
  normalizeId,
  TOKEN_CACHE_PATH,
  type HHSearchResponse,
  type HHVacancyDetailResponse,
} from "../src/helpers";
import { buildUrl } from "../src/commands/search";
import { fileURLToPath } from "node:url";

describe("TOKEN_CACHE_PATH", () => {
  test("is a real filesystem path next to cli/, not a percent-encoded URL pathname", () => {
    // Repo lives under ~/Projects/Рекрутер - URL.pathname would encode it as %D0%A0...
    const cliDir = fileURLToPath(new URL("..", import.meta.url));
    expect(TOKEN_CACHE_PATH).toBe(cliDir + ".token-cache.json");
    expect(TOKEN_CACHE_PATH).not.toContain("%");
  });
});

describe("resolveArea", () => {
  test("resolves known city/country names, case-insensitively", () => {
    expect(resolveArea("moscow")).toBe("1");
    expect(resolveArea("Moscow")).toBe("1");
    expect(resolveArea("москва")).toBe("1");
    expect(resolveArea("МОСКВА")).toBe("1");
    expect(resolveArea("moscow-oblast")).toBe("2019");
    expect(resolveArea("московская область")).toBe("2019");
    expect(resolveArea("spb")).toBe("2");
    expect(resolveArea("санкт-петербург")).toBe("2");
    expect(resolveArea("russia")).toBe("113");
    expect(resolveArea("россия")).toBe("113");
  });

  test("passes through a raw numeric id", () => {
    expect(resolveArea("54")).toBe("54");
  });

  test("returns null for an unrecognized non-numeric location", () => {
    expect(resolveArea("Atlantis")).toBeNull();
  });
});

describe("resolveAreas", () => {
  test("resolves a comma-separated list of known areas", () => {
    expect(resolveAreas("moscow,moscow-oblast,spb")).toEqual(["1", "2019", "2"]);
  });

  test("trims whitespace around each entry", () => {
    expect(resolveAreas(" moscow , spb ")).toEqual(["1", "2"]);
  });

  test("resolves a single area the same as resolveArea", () => {
    expect(resolveAreas("russia")).toEqual(["113"]);
  });

  test("returns null if any entry is unrecognized", () => {
    expect(resolveAreas("moscow,Atlantis")).toBeNull();
  });
});

describe("stripHtml", () => {
  test("converts <br> and block-close tags to newlines", () => {
    const html = "<p>Первый абзац.</p><p>Второй.<br>Со строкой.</p>";
    const text = stripHtml(html);
    expect(text).toContain("Первый абзац.");
    expect(text).toContain("Второй.");
    expect(text).toContain("Со строкой.");
    expect(text).not.toContain("<");
  });

  test("decodes common HTML entities", () => {
    expect(stripHtml("Tom &amp; Jerry &mdash;? &quot;test&quot;")).toContain('"test"');
    expect(stripHtml("A &lt; B &gt; C")).toBe("A < B > C");
  });

  test("collapses 3+ newlines to a blank line", () => {
    const html = "<div>a</div><div>b</div><div></div><div>c</div>";
    const text = stripHtml(html);
    expect(text).not.toMatch(/\n{3,}/);
  });
});

describe("mapSearchResponse", () => {
  test("maps hh.ru vacancy items to the shared VacancyCard shape", () => {
    const data: HHSearchResponse = {
      found: 1,
      page: 0,
      pages: 1,
      items: [
        {
          id: "123",
          name: "Agile coach",
          employer: { name: "Acme" },
          area: { name: "Москва" },
          published_at: "2026-09-10T12:00:00+0300",
          alternate_url: "https://hh.ru/vacancy/123",
          salary: { from: 200000, to: null, currency: "RUR" },
        },
      ],
    };
    const [card] = mapSearchResponse(data);
    expect(card).toMatchObject({
      id: "123",
      title: "Agile coach",
      company: "Acme",
      location: "Москва",
      url: "https://hh.ru/vacancy/123",
    });
    expect(card.salary).toContain("200000");
  });

  test("fills missing fields with null, never omits them", () => {
    const data: HHSearchResponse = {
      found: 1,
      page: 0,
      pages: 1,
      items: [{ id: "1", name: "Untitled role" }],
    };
    const [card] = mapSearchResponse(data);
    expect(card.company).toBeNull();
    expect(card.location).toBeNull();
    expect(card.salary).toBeNull();
    expect(card.url).toBe("https://hh.ru/vacancy/1");
  });
});

describe("mapDetailResponse", () => {
  test("strips HTML from description and maps key skills", () => {
    const data: HHVacancyDetailResponse = {
      id: "1",
      name: "Delivery Manager",
      description: "<p>Требуется опыт.</p>",
      key_skills: [{ name: "Agile" }, { name: "Scrum" }],
      experience: { name: "От 3 до 6 лет" },
      schedule: { name: "Удалённая работа" },
      employment: { name: "Полная занятость" },
    };
    const detail = mapDetailResponse(data);
    expect(detail.description).toBe("Требуется опыт.");
    expect(detail.keySkills).toEqual(["Agile", "Scrum"]);
    expect(detail.experience).toBe("От 3 до 6 лет");
  });
});

describe("normalizeId", () => {
  test("accepts a bare numeric id", () => {
    expect(normalizeId("123456789")).toBe("123456789");
  });

  test("extracts the id from a full hh.ru vacancy URL", () => {
    expect(normalizeId("https://hh.ru/vacancy/123456789")).toBe("123456789");
    expect(normalizeId("https://hh.ru/vacancy/123456789?query=1")).toBe("123456789");
  });

  test("returns null for unparseable input", () => {
    expect(normalizeId("not-an-id")).toBeNull();
  });
});

describe("buildUrl", () => {
  test("includes text, area, page and per_page", () => {
    const url = buildUrl(
      { query: "Agile coach", location: "moscow", remote: false, page: 1, format: "json" },
      ["1"],
    );
    expect(url).toContain("text=Agile");
    expect(url).toContain("area=1");
    expect(url).toContain("page=0");
    expect(url).toContain("per_page=20");
  });

  test("repeats the area param for multiple areas (hh.ru OR filter)", () => {
    const url = buildUrl(
      { location: "moscow,moscow-oblast,spb", remote: false, page: 1, format: "json" },
      ["1", "2019", "2"],
    );
    const params = new URL(url).searchParams;
    expect(params.getAll("area")).toEqual(["1", "2019", "2"]);
  });

  test("maps --remote to schedule=remote", () => {
    const url = buildUrl(
      { location: "russia", remote: true, page: 1, format: "json" },
      ["113"],
    );
    expect(url).toContain("schedule=remote");
  });

  test("page is 1-indexed for the CLI, 0-indexed in the request", () => {
    const url = buildUrl({ location: "moscow", remote: false, page: 3, format: "json" }, ["1"]);
    expect(url).toContain("page=2");
  });

  test("omits period when --jobage is not set", () => {
    const url = buildUrl({ location: "moscow", remote: false, page: 1, format: "json" }, ["1"]);
    expect(url).not.toContain("period=");
  });

  test("maps --jobage to period", () => {
    const url = buildUrl(
      { location: "moscow", remote: false, page: 1, format: "json", jobage: 14 },
      ["1"],
    );
    expect(url).toContain("period=14");
  });
});
