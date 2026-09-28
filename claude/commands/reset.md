# /reset - Reset Candidate Profile Data

Сброс частей фреймворка поиска работы обратно в пустое состояние, чтобы пользователь мог начать заново через `/setup`.

**Эта команда деструктивна.** Ничего не удаляется, пока пользователь явно не подтвердит. Шаги — строго по порядку.

---

## Step 0: Разбор Scope из аргументов

Проверить `$ARGUMENTS` на ключевое слово scope:

- `profile` — очищает данные профиля кандидата только из файлов навыков (skill files)
- `documents` — удаляет пользовательские файлы только из папки `documents/`
- `all` — и то, и другое

Если `$ARGUMENTS` пуст или не содержит распознанного ключевого слова scope, спросить:

> **Что вы хотите сбросить?**
>
> - **`profile`** — Очистит данные кандидата из файлов навыков (профиль, поведенческий профиль, STAR-примеры, формулировки профиля, персонализированные критерии оценки, поисковые запросы). Структура фреймворка, система оценки и правила написания текстов сохраняются. Используйте, чтобы заново прогнать `/setup` с нуля.
>
> - **`documents`** — Удалит все файлы, которые вы положили в папку `documents/` (PDF резюме, экспорт LinkedIn, дипломы, рекомендации, описания проектов, вставленные вакансии, прошлые заявки). Структура папок и `README.md` сохраняются.
>
> - **`all`** — И то, и другое.
>
> Ответьте `profile`, `documents` или `all`.

Дождаться ответа пользователя, прежде чем продолжать.

---

## Step 1: Показать точно, что будет очищено

Прежде чем что-либо делать, показать пользователю в точности, что будет стёрто.

### Если scope включает `profile`:

Прочитать текущее состояние этих файлов и сообщить, есть ли в каждом содержимое или он уже пуст:

- `.claude/skills/job-application-assistant/01-candidate-profile.md`
- `.claude/skills/job-application-assistant/02-behavioral-profile.md`
- `.claude/skills/job-application-assistant/04-job-evaluation.md` *(только персонализированные зоны соответствия, карьерные цели и ограничения по жизненной ситуации — система оценки сохраняется)*
- `.claude/skills/job-application-assistant/05-cv-templates.md` *(только раздел формулировок профиля и блок контактов внутри LaTeX-шаблона — структура фреймворка сохраняется)*
- `.claude/skills/job-application-assistant/06-cover-letter-templates.md` *(только строка контактов и подпись внутри LaTeX-шаблона — структура фреймворка сохраняется)*
- `.claude/skills/job-application-assistant/07-interview-prep.md` *(только STAR-примеры и разделы STAR-кандидатов — структура фреймворка сохраняется)*
- `.claude/skills/job-scraper/search-queries.md` *(только названия ролей, ключевые слова домена и локации — структура запросов сохраняется)*

Этот список должен оставаться синхронным с тем, что заполняет Step 3 команды `/setup`: каждый файл навыков, в который она пишет данные кандидата, здесь очищается.

Представить в виде:

```
## Сброс profile очистит:

- 01-candidate-profile.md — [есть содержимое / уже пусто]
  Файл будет полностью заменён на пустой шаблон.

- 02-behavioral-profile.md — [есть содержимое / уже пусто]
  Файл будет полностью заменён на пустой шаблон.

- 04-job-evaluation.md — [есть персонализированные критерии / уже пусто]
  Ваши зоны соответствия, карьерные цели, энергозатратные/энергодающие задачи и
  ограничения по жизненной ситуации будут возвращены к плейсхолдерам. Система оценки
  (измерения, диапазоны баллов, веса, Language Gate, чек-лист исследования компании)
  сохраняется.

- 05-cv-templates.md — [есть формулировки профиля или контакты / уже пусто]
  Шаблоны формулировок профиля будут очищены, блок контактов в LaTeX-шаблоне
  возвращён к плейсхолдерам. Структура LaTeX и рекомендации по адаптации сохраняются.

- 06-cover-letter-templates.md — [есть контакты / уже пусто]
  Строка контактов и подпись в LaTeX-шаблоне будут возвращены к плейсхолдерам.
  Структура письма, паттерны открытия и формулировки закрытия сохраняются.

- 07-interview-prep.md — [есть STAR-примеры / уже пусто]
  STAR-примеры и любые заготовки STAR-кандидатов будут очищены. Фреймворк, сложные
  вопросы и рекомендации по ролевым играм сохраняются.

- job-scraper/search-queries.md — [есть персонализированные запросы / уже пусто]
  Ваши job-борды, названия ролей, ключевые слова домена, город и уровни удалённости
  будут возвращены к плейсхолдерам. Структура запросов и разделы фильтров сохраняются.

Следующие файлы НЕ затрагиваются (они содержат правила фреймворка, а не данные кандидата):
  - 03-writing-style.md

Вне scope profile всё ещё хранят ваши личные данные: CLAUDE.md и
cv/main_example.tex. Этот scope охватывает только файлы навыков.
```

### Если scope включает `documents`:

Использовать Glob, чтобы перечислить все файлы в `documents/cv/`, `documents/linkedin/`, `documents/diplomas/`, `documents/references/`, `documents/projects/`, `documents/postings/` и `documents/applications/`. Представить в виде:

```
## Сброс documents удалит:

documents/cv/
  - [имя файла] или «(пусто)»

documents/linkedin/
  - [имя файла] или «(пусто)»

documents/diplomas/
  - [имя файла] или «(пусто)»

documents/references/
  - [имя файла] или «(пусто)»

documents/projects/
  - [имя файла] или «(пусто)»

documents/postings/
  - [имя файла] или «(пусто)»

documents/applications/
  - [подпапка/имя файла] или «(пусто)»

documents/README.md — НЕ удаляется (файл с инструкциями)
```

Если все подпапки documents уже пусты, сообщить «Все подпапки documents уже пусты — нечего удалять» и пропустить шаг подтверждения для этого scope.

---

## Step 2: Требовать явного подтверждения

Показать запрос подтверждения:

> **Это нельзя отменить.**
>
> Введите **`RESET`** (заглавными), чтобы подтвердить, или что угодно другое, чтобы отменить.

Дождаться ответа пользователя.

- Если пользователь ввёл ровно `RESET`: перейти к Step 3.
- Если пользователь ввёл что-то другое: прервать и сообщить «Сброс отменён. Ничего не изменено».

---

## Step 3: Выполнить сброс

### Сброс profile

**Для `01-candidate-profile.md`** заменить содержимое файла на:

```markdown
# Candidate Profile

<!-- Run /setup to populate this file -->

## Identity

## Education

## Professional Experience

## Independent Projects

## Technical Skills

## Publications

## Awards

## References
```

**Для `02-behavioral-profile.md`** заменить содержимое файла на:

```markdown
# Behavioral Profile

<!-- Run /setup to populate this file -->

## Overview

## Strongest Behavioral Traits

## How I Work Best

## Growth Areas

## Mapping to Job Posting Language

## Management Style Preferences

## Using This in Applications
```

**Для `04-job-evaluation.md`** вернуть значения, персонализированные Step 3.4 команды `/setup`, обратно к плейсхолдер-токенам, не трогая ни одной окружающей строки:

| Строка для восстановления | Токен |
|---|---|
| `**Strong match areas:**` | `[YOUR_PRIMARY_SKILLS]` |
| `**Moderate match areas:**` | `[YOUR_SECONDARY_SKILLS]` |
| `**Weak match areas:**` | `[SKILLS_YOU_LACK]` |
| `**Strong:**` (Experience Match) | `[YOUR_DIRECT_EXPERIENCE_DOMAINS]` |
| `**Moderate:**` (Experience Match) | `[YOUR_ADJACENT_EXPERIENCE]` |
| `**Entry-level:**` (Experience Match) | `[ROLES_WITH_LIMITED_EXPERIENCE]` |
| три пункта `**Career goals:**` | `[YOUR_CAREER_GOAL_1]`, `[YOUR_CAREER_GOAL_2]`, `[YOUR_CAREER_GOAL_3]` |
| `- Tasks that energize:` | `[YOUR_ENERGIZING_TASKS]` |
| `- Tasks that drain:` | `[YOUR_DRAINING_TASKS]` |
| `- **Security**:` | `[YOUR_FINANCIAL_SITUATION_CONTEXT]` |
| `- **Flexibility**:` | `[YOUR_SCHEDULE_CONSTRAINTS]` |
| `- **Professional development**:` | `[YOUR_GROWTH_PRIORITIES]` |

Также удалить любой раздел `## Calibration from Past Applications`, который Path A команды `/setup` пишет на основе исходов заявок пользователя.

Оставить остальную часть `04-job-evaluation.md` без изменений: пять измерений оценки и их диапазоны баллов, веса, Language Gate, рекомендации по red flag, чек-лист исследования компании со схемой кэша и раздел зарплатных бенчмарков. Если Step 3.4 команды `/setup` когда-либо персонализирует значение, не указанное в таблице выше, добавить его и сюда.

**Для `05-cv-templates.md`** найти раздел, начинающийся с `**Profile statement templates`, и продолжающийся до блоков ролевых шаблонов. Заменить только этот раздел на:

```markdown
**Profile statement templates:**

<!-- Run /setup to populate role-specific profile statements -->
```

Затем вернуть блок контактов внутри LaTeX-шаблона файла к плейсхолдер-токенам: `\name{[FIRST_NAME]}{[LAST_NAME]}`, `\address{[YOUR_ADDRESS]}{}{}`, `\phone[mobile]{[YOUR_PHONE]}`, `\email{[YOUR_EMAIL]}`, `[YOUR_LINKEDIN_URL]` и `[YOUR_GITHUB_URL]` в строке `\extrainfo{...}`, и `[YOUR_NAME]` в `pdftitle`. Оставить остальное содержимое `05-cv-templates.md` без изменений.

**Для `06-cover-letter-templates.md`** вернуть строку контактов и подпись внутри LaTeX-шаблона файла к плейсхолдер-токенам: строка `\namesection{}` становится `\namesection{}{\Huge{[YOUR_NAME]}}{  \href{mailto:[YOUR_EMAIL]}{[YOUR_EMAIL]} | [YOUR_PHONE] |  \urlstyle{same}\href{[YOUR_LINKEDIN_URL]}{LinkedIn}`, а `\signature{...}` становится `\signature{[YOUR_NAME]}`. Оставить остальное содержимое `06-cover-letter-templates.md` без изменений — структура письма, паттерны открытия и формулировки закрытия относятся к фреймворку, а не к данным кандидата. Если Step 3.6 команды `/setup` когда-либо персонализирует что-то помимо этих двух строк, добавить это и сюда.

**Для `07-interview-prep.md`** найти и удалить:
- Весь раздел `## Ready-Made STAR Examples` и все нумерованные STAR-примеры в нём
- Любой раздел `## STAR Candidates (Complete Manually)`, добавленный Path A команды `/setup`

Заменить на:

```markdown
## Ready-Made STAR Examples

<!-- Run /setup to populate STAR examples from your actual experience -->
```

Оставить остальное содержимое `07-interview-prep.md` без изменений (объяснение формата STAR, сложные вопросы, вопросы интервьюерам, советы по телефонному/видеозвонку, этикет follow-up, рекомендации по ролевым играм).

**Для `.claude/skills/job-scraper/search-queries.md`** вернуть значения, персонализированные Step 3.9 команды `/setup`, обратно к плейсхолдер-токенам:

- **Search Sites**: названия бордов обратно к `[YOUR_JOB_BOARD]`, `[YOUR_INDUSTRY_JOB_BOARD]`, `[YOUR_ADDITIONAL_JOB_BOARD]`, фильтр LinkedIn обратно к `[YOUR_COUNTRY]` / `[YOUR_CITY]`.
- **Query Categories**: четыре приоритетных заголовка обратно к `[YOUR_PRIMARY_ROLE_TYPE]`, `[YOUR_DOMAIN_EXPERTISE]`, `[YOUR_ADJACENT_ROLE_TYPE]` и `Broader Technical / Consulting`; внутри блоков запросов — названия, навыки и термины домена обратно к `[YOUR_PRIMARY_JOB_TITLE_1]`, `[YOUR_PRIMARY_JOB_TITLE_2]`, `[YOUR_ADJACENT_TITLE_1]`, `[YOUR_ADJACENT_TITLE_2]`, `[YOUR_KEY_SKILL]`, `[YOUR_DOMAIN_KEYWORD_1]`, `[YOUR_DOMAIN_KEYWORD_2]`, `[YOUR_DOMAIN]`, локации обратно к `[YOUR_CITY]`, `[YOUR_COUNTRY]`, `[YOUR_REGION]`.
- **Location Filter**: уровни удалённости обратно к `[YOUR_CITY]`, `[ACCEPTABLE_AREA_1]`, `[ACCEPTABLE_AREA_2]`, `[BORDERLINE_AREA]`, `[TOO_FAR_AREA]`.
- Удалить любые дополнительные приоритетные категории или переведённые дубликаты запросов, добавленные `/setup` сверх четырёх стандартных уровней.

Оставить остальную часть файла без изменений: объяснение портал-CLI и фолбэка на WebSearch, заметку про языковой охват, рекомендацию «группировать по функции, а не по названию должности», а также разделы Language, Date и Adapting Queries.

### Сброс documents

Для каждой непустой подпапки documents удалить все файлы внутри неё через Bash `rm`. Саму папку не удалять, `documents/README.md` не удалять.

```bash
rm -f documents/cv/*
rm -f documents/linkedin/*
rm -f documents/diplomas/*
rm -f documents/references/*
rm -f documents/projects/*
rm -f documents/postings/*
rm -rf documents/applications/*/
```

---

## Step 4: Подтвердить, что сделано, и следующие шаги

После завершения сброса сообщить:

```
## Сброс завершён

### Очищено
[Список каждого файла/папки, которые были фактически изменены или очищены]

### Без изменений
[Список того, что уже было пустым или было намеренно сохранено]
```

Затем сказать пользователю, что делать дальше, в зависимости от того, что было сброшено:

**Если profile был сброшен:**
> Файлы навыков теперь пусты. Запустите `/setup`, чтобы заполнить их заново. Команда автоматически определяет файлы в папке `documents/` и предлагает читать оттуда; иначе она проведёт вас через импорт резюме или интерактивное интервью.
>
> Учтите, что `CLAUDE.md` и `cv/main_example.tex` находятся вне scope `profile` и всё ещё хранят ваши личные данные. Если вы передаёте этот форк кому-то ещё или делаете его публичным, очистите их вручную.

**Если documents были сброшены:**
> Папка `documents/` теперь пуста. Добавьте карьерные документы и запустите `/setup`, чтобы заполнить профиль. Инструкции о том, что куда класть — в `documents/README.md`.

**Если сброшено и то, и другое:**
> И файлы профиля, и папка documents теперь пусты. Добавьте документы в `documents/` (или пропустите этот шаг и используйте импорт резюме / интервью), затем запустите `/setup`.
