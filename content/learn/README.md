# Dopple Learn content

Free lessons and practice questions for anyone (ADR 0011). This folder is the source of truth:
`pnpm learn:load` validates it and copies it into Postgres, and the website serves it at `/learn`.

- `subjects.json`: every subject, with the classes that take it under the 2025 curriculum
  (`docs/research/nigeria-education.md`). The two early-years subjects are Dopple's own grouping
  of the ECCDE curriculum.
- `topics/<class>-<name>.json`: one lesson each, with its practice questions. The file name, and
  the `slug`, start with the class (`jss-1-hcf-and-lcm`). The website's address drops the class
  prefix from the topic: `/learn/jss-1/hcf-and-lcm`.

## Writing a lesson

- Follow the class's scheme of work (NERDC), in the order schools teach it (`position`).
- Plain English for the class's age. Nigerian names, places, money (₦) and everyday things.
- Lesson blocks: `h` (heading), `p` (paragraph), `list`, `example` (title + steps) and `tip`.
  No HTML or Markdown: blocks are rendered as text.
- At least 3 questions, each with exactly 4 options (A to D), `answer` as the index (0 = A), and
  an explanation that shows the working, plus why a tempting wrong answer is wrong.
- **Write your own questions.** Never copy WAEC, NECO or JAMB past questions; they own them.
- Work out every answer yourself, then have a second teacher check it in the pull request.

`pnpm --filter @dopple/api test` checks the format (four options, a valid answer, known subjects
and classes, no repeated slugs or positions) before anything reaches the database.
