# Career title files (test data)

Five `.txt` title files for the page «محتوى المسارات الوظيفية» (`/career-content`). Each is for one real job title of the dev database; the code in the file name is the title's code and is also written in its «المطلوب» part (the platform refuses a file whose code differs from the title's).

| File | Title code |
|---|---|
| 01-…-منسق-عمليات | OPS.01.01.01-L9P-01 |
| 02-…-أخصائي-عمليات | OPS.01.01.01-L7P-01 |
| 03-…-أخصائي-تطوير-أعمال | GRW.01.00.00-L7P-01 |
| 04-…-منسق-الشراكات-وعلاقات-العملاء | GRW.03.00.00-L9P-01 |
| 05-…-أخصائي-أبحاث | CON.01.00.00-L7P-01 |
| 06-…-مهندس-برمجيات-أول-غير-مرتب | OPS.03.01.03-L6P-01 |

Use: open the title in the list → «رفع ملف المسمى» → drop the file (or paste its text) → the review table must show every part «سليم» → save. Every file was checked with `readTitleFile` (no problems).

Format rules the reader depends on: `apps/api/src/modules/career-profile/domain/rules/*.rules.ts` (job-description, development, learning-plan, required-actions). Reference sample: `domain/rules/fixtures/title-file.sample.ts`.

**File 06 is deliberately messy** (a job posting copy): the parts come in another order (required items first, then the learning plan, then the description), with other headings, bullets and a table written with `|`, and with text that is not career content (company story, benefits and salary, contact details, the department list, page buttons). The fixed reader finds only the required items, so the dialog offers «Analyse with AI»; the AI should still place every part. Use it on the title «مهندس برمجيات أول».
