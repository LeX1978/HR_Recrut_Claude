---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

Этот workspace устроен для управления поиском работы: инструменты скрапинга, резюме, сопроводительные письма и подготовка к интервью.

## Thin-Pointer Design (Single Source of Truth)

Чтобы предотвратить дублирование и рассинхронизацию конфигурации между разными AI-агентными фреймворками (Claude Code, Google Antigravity, Codex, Cursor, Gemini CLI и т.д.), этот workspace использует единый дизайн "тонких указателей". Все агентные runtime должны загружать канонические спецификации и профиль кандидата из файлов и директорий ниже:

1. **Личный профиль кандидата:**
   - Профиль кандидата, контактные данные, образование и целевые предпочтения определены в [CLAUDE.md](CLAUDE.md) и отдельных файлах методологии профиля под [.claude/skills/job-application-assistant/](.claude/skills/job-application-assistant/) (в частности `01-*.md` и т.д.).
2. **Канонические спецификации workflow:**
   - Пошаговые инструкции и триггеры для задач (setup, scrape, rank, apply, upskill, interview) определены в директории [.claude/](.claude/) (в частности, под `.claude/skills/` и `.claude/commands/`).
   - Не дублировать эти правила или спецификации. Относиться к файлам `.claude/` как к единственному источнику истины.
3. **Portal Search Skills:**
   - CLI поиска по job-порталам живут под [.agents/skills/](.agents/skills/) в переносимом формате Agent Skills (с `SKILL.md` на каждый портал). Codex и Antigravity обнаруживают их автоматически; workflow `/scrape` в [.claude/skills/job-scraper/](.claude/skills/job-scraper/) оркестрирует их.
