# Setup Guide

Пошаговая инструкция по запуску фреймворка AI Job Search.

## 1. Prerequisites

### Claude Code

Установить Claude Code (CLI от Anthropic для Claude):

```bash
npm install -g @anthropic-ai/claude-code
```

Понадобится API-ключ Anthropic или подписка Claude Pro/Team. Подробности — в [документации Claude Code](https://docs.anthropic.com/en/docs/claude-code).

### Python

Для вспомогательных инструментов (дедуп-ключи, проверка вёрстки PDF, guard-скрипты безопасности) требуется Python 3.10+. Проверить версию:

```bash
python3 --version
```

На Windows чаще всего надёжнее сработает `py --version`. Если в системе Python доступен как `python`, а не `python3`, использовать `python` в командах ниже.

### Bun (for job search tools)

CLI job-порталов (`hh-search` для рынка РФ/СНГ, плюс не привязанные к стране `linkedin-search` и `freehire-search`) написаны на TypeScript и запускаются через Bun.

- macOS/Linux:

```bash
curl -fsSL https://bun.sh/install | bash
```

- Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://bun.sh/install.ps1 | iex"
```

Если предпочитаете менеджер пакетов, на Windows также работает `winget install Oven-sh.Bun`.

### LaTeX (for compiling CVs and cover letters)

Установить дистрибутив LaTeX, чтобы компилировать сгенерированные файлы `.tex` в PDF:

- **Windows:** [MiKTeX](https://miktex.org/download)
- **macOS:** [MacTeX](https://tug.org/mactex/)
- **Linux:** `sudo apt install texlive-full` или `sudo dnf install texlive-scheme-full`

Резюме компилируется через `lualatex` (pdflatex часто падает на современных установках MiKTeX с ошибками font-expansion в `fontawesome5`). Сопроводительное письмо компилируется через `xelatex`, потому что `cover.cls` требует `fontspec` для своих кастомных шрифтов Lato/Raleway.

#### Minimal TeX install: TinyTeX/BasicTeX

Полные дистрибутивы TeX работают из коробки, но минимальным нужно несколько дополнительных пакетов, прежде чем стандартные шаблоны скомпилируются.

На macOS пользовательская установка TinyTeX избегает системного инсталлятора и не требует `sudo`:

```bash
curl -fsSL https://yihui.org/tinytex/install-bin-unix.sh -o /tmp/tinytex-install-bin-unix.sh
sh /tmp/tinytex-install-bin-unix.sh /tmp --no-path
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
```

Затем установить зависимости шаблона:

```bash
tlmgr install \
  moderncv fontawesome5 fontawesome6 academicons import luatexbase pgf \
  titlesec textpos xltxtra xunicode cite realscripts needspace
```

Для BasicTeX/MacTeX сначала убедиться, что директория бинарников TeX в `PATH` (например, через `/Library/TeX/texbin`), затем запустить ту же команду `tlmgr install ...`.

Быстрые проверки после установки:

```bash
cd cv && lualatex -interaction=nonstopmode -halt-on-error main_example.tex && cd ..

SMOKE_DIR="$(mktemp -d /tmp/ai-job-cover-smoke.XXXXXX)"
cp -R cover_letters/cover.cls cover_letters/OpenFonts "$SMOKE_DIR/"
cat >"$SMOKE_DIR/cover_smoke.tex" <<'EOF'
\documentclass[]{cover}
\begin{document}
\namesection{Test}{Candidate}{test@example.com}
\companyname{Example Company}
\companyaddress{123 Hiring Street\\Example City}
\currentdate{\today}
\lettercontent{Dear Hiring Manager,}
\lettercontent{This smoke test verifies that xelatex can load cover.cls and the bundled fonts.}
\closing{Sincerely,}
\signature{Test Candidate}
\end{document}
EOF
(cd "$SMOKE_DIR" && xelatex -interaction=nonstopmode -halt-on-error cover_smoke.tex)
```

#### Windows: Basic MiKTeX

Полный инсталлятор MiKTeX включает все пакеты CTAN и работает из коробки, но инсталлятор поменьше — [Basic MiKTeX](https://miktex.org/download) (`basic-miktex-*.exe`) — поставляет только минимальный набор пакетов и требует пары одноразовых настроек, прежде чем стандартные шаблоны скомпилируются.

По умолчанию MiKTeX устанавливает недостающие пакеты по требованию, но выводит GUI-запрос на каждый — это блокирует неинтерактивные терминалы (включая инструмент Bash в Claude Code). Вместо этого включить тихую автоустановку:

```powershell
initexmf --admin --set-config-value=[MPM]AutoInstall=1
initexmf --set-config-value=[MPM]AutoInstall=1
```

(Первую строку запустить из PowerShell с повышенными правами/от Admin, если MiKTeX установлен для всех пользователей; вторая строка покрывает установку для одного пользователя. Применится только одна, в зависимости от способа установки — запустить обе безвредно.)

Если вы предпочитаете вообще не полагаться на установку "на лету" (например, для полностью офлайн-компиляции позже), предустановить тот же набор пакетов, что перечислен выше в разделе про macOS TinyTeX, через менеджер пакетов MiKTeX:

```powershell
mpm --admin --install=moderncv --install=fontawesome5 --install=fontawesome6 --install=academicons --install=import --install=luatexbase --install=pgf --install=titlesec --install=textpos --install=xltxtra --install=xunicode --install=cite --install=realscripts --install=needspace
```

Убрать `--admin`, если MiKTeX установлен только для текущего пользователя. Если название пакета не разрешается, `mpm --find=<name>` ищет в репозитории правильное имя.

Быстрые проверки после установки (PowerShell):

```powershell
Set-Location cv; lualatex -interaction=nonstopmode -halt-on-error main_example.tex; Set-Location ..

$SmokeDir = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "ai-job-cover-smoke-$(Get-Random)")
Copy-Item cover_letters\cover.cls, cover_letters\OpenFonts -Destination $SmokeDir -Recurse
@'
\documentclass[]{cover}
\begin{document}
\namesection{Test}{Candidate}{test@example.com}
\companyname{Example Company}
\companyaddress{123 Hiring Street\\Example City}
\currentdate{\today}
\lettercontent{Dear Hiring Manager,}
\lettercontent{This smoke test verifies that xelatex can load cover.cls and the bundled fonts.}
\closing{Sincerely,}
\signature{Test Candidate}
\end{document}
'@ | Set-Content (Join-Path $SmokeDir "cover_smoke.tex")
Push-Location $SmokeDir; xelatex -interaction=nonstopmode -halt-on-error cover_smoke.tex; Pop-Location
```

### Optional: ATS text extraction (pypdf, then pdftotext)

`/apply` запускает проверку ATS-парсируемости на скомпилированном резюме: извлекает текстовый слой PDF и проверяет контакты, порядок чтения и покрытие ключевых слов так, как их видит applicant-tracking система.

Экстрактор по умолчанию — **pypdf** (BSD, `pip install pypdf`). Poppler `pdftotext` остаётся опциональным фолбэком:

- **macOS:** `brew install poppler`
- **Debian/Ubuntu:** `sudo apt install poppler-utils`
- **Windows:** `choco install poppler`

Если команда всё же использует `pdftotext -layout`, ей также нужен флаг `-enc UTF-8`. Если **ни один** экстрактор недоступен, `/apply` пропускает механическую проверку с предупреждением и откатывается на визуальный обзор ключевых слов — всё остальное работает как обычно.

## 2. This copy

Это личный, только локальный проект (`Рекрутер`) — не GitHub-форк чего-либо, нет remote `upstream`, пуш не настроен. Коммиты остаются на локальной машине. Если вы настраиваете свою копию с нуля, сделайте `git clone`/`git init` там, где храните личные проекты; ничего специфичного для GitHub настраивать не нужно.

## 3. Install job search CLI dependencies
Запускать эти команды из корня репозитория.

- PowerShell:

```powershell
$tools = @("hh-search", "linkedin-search", "freehire-search")
foreach ($tool in $tools) {
  Push-Location ".agents/skills/$tool/cli"
  bun install
  Pop-Location
}
```

- Bash / zsh / Git Bash:
```bash
for tool in hh-search linkedin-search freehire-search; do
  (cd .agents/skills/$tool/cli && bun install)
done
```

Для `linkedin-search` и `freehire-search` установка опциональна: у обоих нет зависимостей времени выполнения, они запускаются простым `bun`; `bun install` только подтягивает TypeScript dev-типы. `hh-search` дополнительно нужен токен приложения — зарегистрировать его на [dev.hh.ru/admin](https://dev.hh.ru/admin) и задать `HH_CLIENT_ID`/`HH_CLIENT_SECRET` в `.env` в корне репозитория (см. его `SKILL.md`).

Для любого другого локального job-борда сгенерировать эквивалентный search-skill через `/add-portal` — он выстраивает ту же CLI-структуру для любого публичного портала и тестово прогоняет живой запрос перед регистрацией. См. раздел "Job search tools" в README.

## 4. Run the setup interview

Запустить Claude Code в репозитории:

```bash
claude
```

Затем запустить онбординг:

```
/setup
```

Claude предложит три пути:

- **Path A (папка documents):** добавить резюме, экспорт LinkedIn, дипломы, рекомендации или прошлые заявки под `documents/`. Claude прочитает их и сверит на согласованность перед тем, как предложить обновления профиля. Лучший вариант, когда есть несколько исходных файлов.
- **Path B (импорт одного резюме):** поделиться одним резюме, упомянув файл через `@` или вставив текст. Claude извлечёт данные и задаст уточняющие вопросы про то, чего не хватает.
- **Path C (режим интервью):** ответить на структурированные вопросы интервью, раздел за разделом.

Все три пути дают один и тот же результат: полностью заполненные файлы профиля.

### What gets populated

| Файл | Содержимое |
|------|---------|
| `CLAUDE.md` | Полный профиль кандидата |
| `01-candidate-profile.md` | Структурированное образование, опыт, навыки |
| `02-behavioral-profile.md` | Поведенческая оценка |
| `04-job-evaluation.md` | Персонализированные зоны соответствия навыков и карьерные цели |
| `05-cv-templates.md` | Шаблоны profile statement под ваш бэкграунд |
| `07-interview-prep.md` | STAR-примеры из вашего опыта |
| `cv/main_example.tex` | LaTeX-резюме с реальными данными |
| `search-queries.md` | Поисковые запросы для `/scrape` |

### Re-running setup

Отдельные разделы можно обновить позже:

```
/setup --section skills
/setup --section experience
/setup --section search
```

Опция `--section search` особенно полезна по мере того, как меняются приоритеты. Она заново запускает интервью настройки поиска и предлагает типы ролей, которые вы, возможно, не рассматривали, на основе всего вашего профиля.

## 5. Salary benchmarking

Этот форк не поставляется с отдельным инструментом (унаследованный инструмент датской профсоюзной статистики не имел источника данных по РФ и был удалён 17-09-2026). Когда вакансия или собственное поле зарплаты hh.ru указывают вилку, `/apply` цитирует её напрямую; иначе строка зарплаты пропускается.

## 6. Test the workflow

Найти интересную вакансию, затем:

```
/apply https://hh.ru/vacancy/1234567
```

Или вставить текст вакансии напрямую:

```
/apply [вставьте текст вакансии сюда]
```

Claude:
1. Оценит соответствие вашему профилю
2. Спросит, продолжать ли
3. Составит черновик адаптированного резюме и сопроводительного письма
4. Прогонит черновики через reviewer-агента для критики
5. Доработает и представит финальный результат

## 7. Compile your documents

После того как `/apply` создаст LaTeX-файлы:

```bash
# Bash / zsh / Git Bash
cd cv && lualatex main_<company>_<role>.tex && cd ..
cd cover_letters && xelatex cover_<company>_<role>.tex && cd ..
```

```powershell
# PowerShell
Set-Location cv; lualatex main_<company>_<role>.tex; Set-Location ..
Set-Location cover_letters; xelatex cover_<company>_<role>.tex; Set-Location ..
```

Эти команды применяются к стандартным шаблонам (moderncv CV, `cover.cls` для письма). Если вы предпочитаете свой LaTeX-шаблон, запустите `/add-template` — он захватывает движок компиляции шаблона, шрифты, правила стиля и лимит страниц, тестово компилирует его и подключает к `/apply`. См. раздел "LaTeX templates" в README.

## Troubleshooting

### Job search CLI tools not working
Убедитесь, что Bun установлен и `bun install` был запущен в каждой CLI-директории. Инструментам нужен доступ к сети, чтобы загружать листинги вакансий. Для `hh-search` конкретно проверьте, что `HH_CLIENT_ID`/`HH_CLIENT_SECRET` заданы в `.env` в корне репозитория - `403 {"errors":[{"type":"forbidden"}]}` от `search`/`detail` означает, что отсутствует токен приложения, а не что портал вас блокирует.

### LaTeX compilation errors
- CV: использует `lualatex` (pdflatex часто падает на современных установках MiKTeX с ошибками font-expansion в `fontawesome5`; lualatex обрабатывает те же исходники без проблем)
- Cover letter: использует `xelatex` (`cover.cls` задаёт все шрифты как системный DejaVu Sans - полное покрытие кириллицы, встроенные файлы шрифтов больше не нужны)
- Убедитесь, что ваш дистрибутив LaTeX включает пакет `moderncv`

### Stale `.claude/settings.local.json` from an older clone
Общие разрешения Claude Code теперь живут в `.claude/settings.json`. Более ранние версии этого репозитория коммитили более широкий `.claude/settings.local.json`, предварительно одобрявший `Bash(curl:*)`, `Bash(python:*)` и `Bash(bun:*)`. Если вы клонировали репозиторий до этого изменения, git оставляет старый файл в вашей рабочей копии, и его разрешения по-прежнему применяются поверх `settings.json`. Удалите его (или урежьте до собственных личных переопределений):

```bash
rm .claude/settings.local.json
```
