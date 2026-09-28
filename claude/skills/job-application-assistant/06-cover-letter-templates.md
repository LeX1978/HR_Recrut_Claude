---
framework_version: 1.0.3
---

# Cover Letter Templates and Tailoring Guide

## PDF is optional (17-09-2026)

Каноническая форма сопроводительного письма - это **обычный текст**, записанный в заметку Obsidian `applications/<company>_<role>.md` (`/apply` Step 6c). Большинство откликов в РФ идут через текстовое поле портала (hh.ru, career.habr.com), а не через загрузку файла, поэтому скомпилированный PDF - исключение, а не значение по умолчанию. Компилировать его только когда конкретная вакансия или её портал явно требуют файл-вложение — в этом случае всё нижеописанное в этом файле по-прежнему применяется без изменений.

## Template: Custom cover.cls (XeLaTeX)

Сопроводительные письма используют кастомный LaTeX-класс документа (`cover.cls`), который задаёт все шрифты как **DejaVu Sans** (системный шрифт, полное покрытие латиницы+кириллицы). Встроенный набор `OpenFonts/fonts/` Lato/Raleway не имеет кириллических глифов и больше не используется классом — не возвращать `\fontspec[Path = OpenFonts/fonts/...]` нигде в черновике письма, использовать обычные команды класса (`\lettercontent`, `\closing` и т.д.) или напрямую `\fontspec{DejaVu Sans}`, если разовому блоку нужен явный контроль шрифта (например, блок `itemize` со списком под `\lettercontent`).

**Файл на выходе:** `cover_letters/cover_<company>_<role>.tex`
**Компилировать через:** XeLaTeX (cover.cls требует fontspec)

### Date field

`\today` всегда рендерится по-английски (babel/polyglossia не подключены), независимо от языка письма. Использовать `\currentdate{\rutoday}` для письма на русском (команда `\rutoday` определена в `cover.cls`, например "16 сентября 2026 г.") и `\currentdate{\today}` только для письма на английском.

### Compile command

```bash
cd cover_letters && xelatex -interaction=nonstopmode cover_<company>_<role>.tex
```

Ожидаемый вывод: `Output written on cover_<company>_<role>.pdf (1 page, ...)`. Любое количество страниц, отличное от 1, - это ошибка, которую нужно исправить перед показом пользователю.

## Compile-and-Inspect Loop (MANDATORY when a PDF is produced)

Применяется только когда Step 5 команды `/apply` решил, что PDF действительно нужен (см. "PDF is optional" выше) — большинство заявок этот цикл вообще пропускают. Когда PDF нужен: после написания сопроводительного письма и перед показом пользователю всегда компилировать и визуально проверять PDF. Итерировать, пока верстка не станет чистой:

1. Запустить `xelatex -interaction=nonstopmode cover_<company>_<role>.tex`
2. Подтвердить, что количество страниц ровно 1 и компиляция прошла успешно
3. Прочитать PDF через инструмент Read и визуально проверить: подпись помещается внизу, текст нигде не обрезан, шрифт списка совпадает с телом письма

### Known template pitfall: itemize inside `\lettercontent{}`

Макрос `\lettercontent{}` добавляет `\\` к своему аргументу. Это ломается, если аргумент заканчивается на `\end{itemize}`, потому что после закрытия окружения `\\` некуда переносить строку - получается `! LaTeX Error: There's no line here to end.` и PDF не выводится.

**Wrong (breaks compile):**
```latex
\lettercontent{Here is how my experience maps:
\begin{itemize}
    \item ...
\end{itemize}}
```

**Правильно — закрыть `\lettercontent{}` перед списком и обернуть список в тот же шрифт DejaVu Sans, чтобы типографика оставалась согласованной:**
```latex
\lettercontent{Here is how my experience maps:}

{\raggedright\fontspec{DejaVu Sans}\fontsize{11pt}{13pt}\selectfont
\begin{itemize}
    \item ...
\end{itemize}\par}
\vspace{6pt}

\lettercontent{[next paragraph]}
```

Обёртка со шрифтом обязательна — если просто вынести `\begin{itemize}` за пределы `\lettercontent{}` без блока `\fontspec`, список отрендерится в дефолтном шрифте тела (Lato) и будет визуально не совпадать с остальным письмом.

## Document Structure

```latex
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Cover Letter - [Company], [Role]
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\documentclass[]{cover}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhf{}

\rfoot{Page \thepage \hspace{0pt}}
\thispagestyle{empty}
\renewcommand{\headrulewidth}{0pt}
\begin{document}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%     TITLE NAME
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\namesection{}{\Huge{[YOUR_NAME]}}{  \href{mailto:[YOUR_EMAIL]}{[YOUR_EMAIL]} | [YOUR_PHONE] |  \urlstyle{same}\href{[YOUR_LINKEDIN_URL]}{LinkedIn}
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%     MAIN COVER LETTER CONTENT
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\currentdate{\today} % or \rutoday for a Russian-language letter
\lettercontent{Dear [Name/Team],}

\lettercontent{[Opening paragraph - role, connection to background, 2-3 sentences]}

\lettercontent{[Body paragraph - most relevant experience, introducing the bullet list]}

{\raggedright\fontspec{DejaVu Sans}\fontsize{11pt}{13pt}\selectfont
\begin{itemize}
    \item {[Concrete achievement/skill 1]}
    \item {[Concrete achievement/skill 2]}
    \item {[Concrete achievement/skill 3]}
\end{itemize}\par}

\lettercontent{[Connection to company - why this role, why this company specifically]}

\lettercontent{[Personal fit paragraph - behavioral strengths, team contribution, 2-3 sentences]}

\lettercontent{I look forward to hearing from you.}

\begin{flushright}
% No trailing \\ inside \closing{} - cover.cls appends its own \\, and a
% doubled break triggers "! LaTeX Error: There's no line here to end."
\closing{Kind regards,}

\signature{[YOUR_NAME]}
\end{flushright}
\end{document}
```

## Key Commands Reference

| Команда | Назначение |
|---------|---------|
| `\namesection{}{Name}{contact info}` | Шапка с именем и контактами |
| `\currentdate{date}` | Поле даты (`\rutoday` для русского, `\today` для английского, или явный текст) |
| `\lettercontent{text}` | Абзац тела письма (добавляет отступ после себя) |
| `\closing{text}` | Строка закрытия |
| `\signature{name}` | Напечатанное имя под подписью |

## Tailoring Guidelines

### Salutation
- Если известно имя нанимающего менеджера: "Уважаемый(ая) [Имя Фамилия],"
- Если известна команда: "Уважаемая команда [Компания],"
- Общий вариант: "Уважаемые коллеги," (избегать безличных штампов вроде "Кому это может быть интересно")

### Length - Hard 1-Page Limit
- Цель: 1 страница, включая блок подписи
- Максимум: **никогда не превышать 1 страницу**
- **Бюджет слов: 250-300 слов** текста тела письма (не считая LaTeX-разметку). Это безопасный максимум. 350 слов вызовут переполнение.
- **Всегда считать**: открывающий абзац + абзац со списком + закрывающий абзац = 3 блока. Добавлять 4-й только если остальные короткие.
- При добавлении контента, специфичного для компании, сокращать остальной контент, а не увеличивать общий объём

### Line Spacing
- Добавить `\usepackage{setspace}` и `\setstretch{1.0}`, если письмо длинное и нужно уместить на одну страницу
- Использовать `\vspace{.5cm}` между крупными разделами для читаемости (только если позволяет место)

### Bullet Lists
- Размещать `\begin{itemize}...\end{itemize}` **вне** блока `\lettercontent{}` (см. "Known template pitfall" выше), обёрнутым в тот же `\fontspec{DejaVu Sans}`, чтобы шрифт списка совпадал с телом письма
- Идеально 3-5 пунктов
- Начинать каждый пункт с жирной метки или глагола действия
- Использовать `\textbf{Метка:}` для пунктов в стиле категорий
- Пункт, текст которого начинается с буквального `[`, должен быть в фигурных скобках: `\item {[text]}`. Без скобок LaTeX распознает `[text]` как опциональную метку `\item` и отрендерит её за левым краем страницы, полностью пропав из текстового слоя PDF

### LaTeX Special Characters
Экранировать эти символы везде, где они встречаются в тексте письма:
- Амперсанд: `\&` (названия компаний: Brüel \& Kjær, H\&M) - без экранирования компиляция падает громко
- Процент: `\%` ("выручка выросла на 30\%") - без экранирования компиляция **не** падает: всё после `%` на этой строке молча съедается как LaTeX-комментарий
- Доллар: `\$`, решётка: `\#`, подчёркивание: `\_`
- Тильда: `\textasciitilde{}`, циркумфлекс: `\textasciicircum{}`, обратный слэш: `\textbackslash{}`

### Non-Russian Cover Letters
- Та же структура шаблона, просто писать содержимое на языке вакансии
- Скорректировать формат даты под локальную конвенцию (см. раздел Date field выше про выбор `\rutoday` vs `\today`)
- Скорректировать закрытие под локальную конвенцию (например, "С уважением," для русского, "Best regards," для английского)

## Checklist Before Finalizing
- [ ] Нет длинных тире (использовать запятые или точки вместо них)
- [ ] Нет клише или пустых слов-паразитов
- [ ] Каждое утверждение подкреплено конкретным примером
- [ ] Обращённая в будущее подача: фокус на задачах, которые предстоит решить, а не только на прошлых обязанностях
- [ ] Раздел мотивации ссылается на миссию/ценности именно этой компании
- [ ] Название компании и роль указаны верно везде по тексту
- [ ] Дата актуальна
- [ ] Помещается на одну страницу
- [ ] Язык соответствует языку вакансии
- [ ] Обращение уместно (по имени, если возможно)
- [ ] Заголовок цепляющий и конкретный, а не общий

## Submission Guidelines (Best Practice)
- Отправлять только те документы, которые запрашивает работодатель
- Экспортировать в PDF, чтобы сохранить форматирование
- Называть файлы понятно: "[Имя] CV" и "[Имя] Cover Letter"
- Следовать всем инструкциям работодателя об анонимности или конкретных материалах
