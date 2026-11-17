# خطة: مزامنة بيانات الإنتاج (live) إلى بيئة الاختبار (staging)

التاريخ: 2026-11-17 · الفرع: dev · الحالة: **مكتوبة، لم تُبنَ بعد** (قاعدة 12) · طلب المالك: «داتا اللايف تتنسخ دايمًا على سيرفر staging، من سكريبت على GitHub بأسرار من GitHub».

لا شاشات في هذه الخطة (لا tour، لا دليل مستخدم، لا صلاحيات، لا FR جديد): هي عمل تشغيلي. جدول أو عمود جديد في قاعدة البيانات: **لا يوجد** (قاعدة 11 لا تنطبق).

## 1. الهدف والمبدأ

- staging يحمل نسخة حديثة من بيانات الإنتاج لاختبار الـmigrations الجديدة (فرع `dev` يسبق `main`) على بيانات حقيقية الشكل.
- **البيانات الحساسة لا تبقى حقيقية في staging.** الهوية والآيبان والراتب والتواريخ والأسرار تُمسح أو تُستبدل قبل أن يراها أحد.
- **staging لا يرسل شيئًا لأي شخص حقيقي**، ولا يستخدم أي مفتاح إنتاج.
- السكريبت لا يعرف أي cloud: الإنتاج اليوم على EC2 وقد ينتقل إلى Google Cloud. الذي يتغير عند الانتقال هو **أمر التصدير على الإنتاج فقط** (القسم 4).

## 2. القرارات (للمراجعة قبل البناء)

| # | القرار | السبب |
|---|---|---|
| D1 | **staging يسحب (pull)، الإنتاج لا يدفع.** لا يملك الإنتاج أي مفتاح يصل إلى staging. | اختراق staging (الأضعف) لا يعطي كتابة على الإنتاج. |
| D2 | **لا مفتاح تشفير ولا سر مشترك بين البيئتين** (`FIELD_ENCRYPTION_KEY` و`BLIND_INDEX_KEY` و`BETTER_AUTH_SECRET` وأسرار Microsoft كلها منفصلة). | مفتاح مشترك = اختراق staging يفك هوية وآيبان ورواتب الإنتاج. |
| D3 | **الأعمدة المشفرة تُفرَّغ في staging** (لا تُنقل مشفرة بمفتاح لن يفتحها). | staging له مفتاحه، فالنسخة المنقولة غير قابلة للفك أصلًا. |
| D4 | **التصدير عبر SSH بأمر مقيَّد (forced command)**، لا منفذ PostgreSQL مفتوح، والمجرى (stream) لا يمر على GitHub. | PostgreSQL داخل Docker على السيرفر ومنفذه غير معرَّض. |
| D5 | **مفتاح SSH الخاص بالمزامنة يتولّد على سيرفر staging ولا يغادره** (قرار المالك 2026-11-17)؛ يوضع الـpublic key فقط على الإنتاج. أسرار وصول الـrunner إلى staging تأتي من GitHub Environments. | المفتاح الخاص لا يمر على GitHub أصلًا، فتسريب GitHub لا يعطي وصولًا للإنتاج. |
| D6 | **استعادة في قاعدة مؤقتة ثم تبديل (swap)**؛ فشل أي خطوة يترك staging القديم شغالًا. | لا staging نصف مكسور. |
| D7 | **التردد كل 6 ساعات** (قرار المالك): `cron` على سيرفر staging نفسه (`0 */6 * * *`). المرحلة الأولى لا تحتاج GitHub للجدولة؛ الـworkflow للتشغيل اليدوي (`workflow_dispatch`) فقط. جدولة GitHub (`schedule`) تشتغل من `main` فقط، فلا تُضاف إلا بعد إصدار بكلمة المالك (قاعدة 19). | قيد في GitHub Actions وقاعدة 19. |
| D8 | **الملفات المرفقة تُنقل كلها** (قرار المالك)، فتصير مستندات حقيقية على staging: قرص staging مشفَّر، وصول SSH مقيَّد، ونفس سياسة الإنتاج في التعامل معه. | قرار المالك؛ المخاطرة مسجلة. |
| D9 | **بريد staging عبر Mailpit** (صندوق اختبار داخلي، حاوية في compose الخاص بـstaging، لا يغادر السيرفر). | تُختبر رسائل الدعوة والإشعارات بلا وصول لأي موظف. |
| D10 | **إيميلات الموظفين الحقيقية و`audit_logs` تبقى كاملة** (قرار المالك). | دخول Microsoft بحسابات حقيقية، وسجل كامل. |

## 3. المعمارية

```
GitHub Actions (environment: staging)            سيرفر staging                      سيرفر الإنتاج (EC2 ثم GCP)
  sync-staging.yml  ──SSH (STG key)──►  scripts/server/sync-from-prod.sh
  (workflow_dispatch يدوي،                  │  1. SSH إلى الإنتاج بمفتاح staging المحلي ─►  authorized_keys:
   أو cron على staging كل 6 ساعات)          │     (المفتاح يتولّد على staging)               command="export-for-staging.sh",restrict
                                            │                                                └ pg_dump -Fc من مستخدم قراءة فقط
                                            │  2. استقبال المجرى ◄───────────────────────────  (يُبَث إلى stdout)
                                            │  3. restore في قاعدة مؤقتة arweqah_sync_new
                                            │  4. sanitize-staging.sql
                                            │  5. migrations الخاصة بكود dev على القاعدة المؤقتة
                                            │  6. إيقاف api، swap بالأسماء، تشغيل api
                                            │  7. مزامنة الملفات (القسم 6)
                                            └  8. تقرير + حذف أي dump مؤقت
```

بيانات الإنتاج تمر من الإنتاج إلى staging مباشرة؛ **GitHub يرى الأسرار والسجلات فقط، لا الداتا.**

## 4. التصدير على الإنتاج (الجزء الوحيد الخاص بالـcloud)

- `scripts/server/export-for-staging.sh` (جديد، يُنسخ مع الـdeploy كبقية `scripts/server/*`): يشغّل `pg_dump --format=custom` من حاوية `postgres` باستخدام **مستخدم قاعدة بيانات للقراءة فقط** (`arweqah_sync_ro`: `pg_read_all_data`، بلا كتابة، بلا `CREATE`) ويطبع المجرى على stdout. لا ملفات على قرص الإنتاج.
- **لا تغادر رموز Microsoft الإنتاج (ملاحظة CodeRabbit على PR 121):** يضيف التصدير `--exclude-table-data=auth_accounts` (البنية تُنقل بلا صفوف)، ثم يرسل صفوف الجدول في مجرى ثانٍ بـ`COPY (SELECT <كل الأعمدة غير الرموز>, NULL AS access_token, NULL AS refresh_token, NULL AS id_token, NULL AS access_token_expires_at, NULL AS refresh_token_expires_at FROM auth_accounts) TO STDOUT` بمستخدم القراءة نفسه؛ فلا يستلم staging قيمة رمز أصلية، ولا حاجة لقاعدة مؤقتة ولا لصلاحية كتابة. خطوة التفريغ على staging تبقى احتياطًا.
- مفتاح SSH المزامنة على الإنتاج في `authorized_keys` بالشكل: `command="bash /opt/arweqah-platform/scripts/server/export-for-staging.sh",restrict,from="<IP staging>" ssh-ed25519 …` يعني المفتاح لا يفتح shell ولا ينقل منافذ ولا يشغّل غير التصدير، ومن عنوان staging فقط.
- **عند الانتقال إلى Google Cloud:** إن بقي PostgreSQL في Docker على VM فلا يتغير شيء. إن صار Cloud SQL يتغير سطر الأمر داخل `export-for-staging.sh` فقط إلى `pg_dump` عبر Cloud SQL Auth Proxy من VM وسيط بنفس الـforced command. السكريبتات الأخرى والـworkflow لا تتغير.
- المستخدم `arweqah_sync_ro` يُنشأ مرة واحدة بسكريبت يدوي موثَّق في `scripts/server/` (لا بـmigration: هو إعداد خادم، لا مخطط تطبيق).

## 5. التنظيف (`sanitize-staging.sql`) — الجوهر الأمني

يُنفَّذ على القاعدة المؤقتة **قبل** التبديل، داخل transaction واحدة، وأي خطأ يوقف كل شيء (`ON_ERROR_STOP`).

| الجدول / العمود | الفعل | السبب |
|---|---|---|
| `employees.id_number_enc`, `id_number_hash`, `iban_enc`, `monthly_gross_salary_enc` | `NULL` (ثم قيم تجريبية اختيارية) | حساسة؛ مفتاح staging غير مفتاح الإنتاج. الـhash مرتبط بـ`BLIND_INDEX_KEY` الخاص بالإنتاج. |
| `employees.personal_email`, `personal_phone`, `work_phone`, `birth_date` | استبدال بقيم مولَّدة ثابتة من المعرّف | بيانات شخصية. |
| `employees.work_email`, `users.email` | **تبقى** | الدخول عبر Microsoft يربط بالبريد (`accountLinking`)، ولازم يعمل الاختبار بحسابات حقيقية. إرسال البريد مغلق (الصف بعده). |
| `integration_providers.config`, `verified_hash` | تفريغ `config = '{}'`، ثم يُدرج مزوّد البريد Mailpit ويُفعَّل (الترجمة وTurnstile: مفاتيح staging نفسه **تُحفظ قبل التفريغ وتُعاد بعده** من نسخة محلية على staging لا تغادره، ولا تُستعاد قيم الإنتاج أبدًا، فلا تضيع المفاتيح التي أدخلها staging عند كل دورة) | فيه مفاتيح خارجية حقيقية. بعد التفريغ لا يغادر أي بريد السيرفر. |
| `authenticators.secret_enc`, `authenticator_backup_codes`, `enrollment_invites`, `trusted_devices` | حذف الصفوف | الأسرار مشفرة بمفتاح الإنتاج فلا تُفتح؛ يدخل الموظف بمايكروسوفت أو يسجّل مصادقًا جديدًا. |
| `auth_accounts` | `UPDATE` تفريغ `access_token` و`refresh_token` و`id_token` وتواريخ انتهائها (يبقى الصف لأن الربط بالبريد يعتمد عليه) | رموز Microsoft الحقيقية لا يجب أن تعيش في staging، **ولا أن تغادر الإنتاج**: التفريغ يجري على نسخة معزولة في جهة الإنتاج (قاعدة مؤقتة تُستعاد فيها النسخة ثم تُنظَّف ثم يُصدَّر منها `pg_dump` المنظَّف الذي يُبَثّ إلى staging، وتُحذف القاعدة المؤقتة بعده)، فلا يستلم staging قيمة رمز أصلية في أي لحظة، وقاعدة الإنتاج لا تتغير. |
| `auth_sessions` (والجدول الشقيق للتحقق إن وُجد) | `TRUNCATE` | `BETTER_AUTH_SECRET` مختلف؛ جلسات الإنتاج لا يجب أن تعيش في staging. |
| `outbox_messages`, `scheduled_jobs` | `TRUNCATE` | وإلا تُنفَّذ التذكيرات والرسائل مرتين (إنتاج + staging). |
| `email_logs`, `notifications` | `TRUNCATE` | تحتوي نصوصًا وعناوين حقيقية. |
| `agent_conversations`, `agent_messages` | `TRUNCATE` | محادثات المساعد قد تحوي كلامًا شخصيًا. |
| `audit_logs` | **لا يُلمس، كله يُنقل** (قرار المالك) | سلسلة مرتبطة بـ`prev_hash`، تعديلها يكسر التحقق. |
| ملفات `storage` (القسم 6) | انظر القسم 6 | مرفقات حقيقية. |

ثم يُنشأ مستخدم admin الاختبار: `s.magdy@arweqah.sa` يدخل بمايكروسوفت، و`SEED_ADMIN_TOTP_SECRET` في `.env` الخاص بـstaging للدخول بالمصادق.

**حارس للمستقبل (قاعدة 8):** فحص جديد في `scripts/security-check.mjs` يقرأ كيانات TypeORM ويفشل إن ظهر عمود اسمه يطابق `*_enc` أو `*_hash` أو `secret` أو `token` أو `credential` أو `iban` أو `national` أو `config` (جدول مزوّدين) **ولا يكون مذكورًا في `sanitize-staging.sql` أو في قائمة «مستثنى بسبب» داخل الفحص**. هكذا لا يُضاف عمود حساس لاحقًا وينتقل إلى staging بلا تنظيف. اختبار وحدة للفحص نفسه.

## 6. الملفات المرفوعة (`storage`) — قرار المالك: تُنقل كلها

- الإنتاج الآن `FILE_STORAGE=local` (مجلد `/data/storage` داخل حاوية api، ومنه `scripts/server/backup.sh` يأخذ `tar`)، والخيار S3 موجود (`S3_BUCKET`).
- التصدير: وضع ثانٍ في `export-for-staging.sh` (`files`) يبث `tar -cz` من الحاوية عبر نفس الـforced command (الوضع يُقرأ من `SSH_ORIGINAL_COMMAND` ضمن قائمة بيضاء من كلمتين فقط: `db` و`files`، وأي شيء آخر يُرفض)، وstaging يفكه في مجلد مؤقت **قبل** تبديل قاعدة البيانات، ثم يبدّل القاعدة والملفات معًا كوحدة واحدة؛ وعند فشل أي مرحلة (تجهيز، تبديل، إقلاع الـAPI) تُستعاد القاعدة ومجلد `storage` معًا إلى نسختيهما السابقتين.
- لو صار التخزين S3 أو GCS لاحقًا: `rclone sync` من bucket الإنتاج (قراءة فقط) إلى bucket staging بدل `tar`؛ يتغير هذا الوضع في سكريبت التصدير والمزامنة فقط.
- المخاطرة: مستندات حقيقية على staging (D8).

## 7. أسرار GitHub والإعداد

| الاسم | أين | ما هو |
|---|---|---|
| `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` | environment `staging` (موجودة لـdeploy) | وصول الـrunner إلى staging. **يُفضَّل مفتاح خاص بالمزامنة** (`STG_SYNC_SSH_KEY`) لا مفتاح الـdeploy. |
| *(لا أسرار إنتاج في GitHub)* | — | مفتاح المزامنة مع الإنتاج (D5) يتولّد على staging: `ssh-keygen -t ed25519` في `/opt/arweqah-platform/.sync/` بصلاحية `600` للمستخدم الخدمي فقط. الـpublic key يُنسخ يدويًا مرة واحدة إلى `authorized_keys` على الإنتاج بالقيد في القسم 4. `PROD_HOST` و`PROD_USER` في `.env` الخاص بـstaging. تدويره: مفتاح جديد وتبديل السطر على الإنتاج. |
| `APP_URL` | variable في `staging` (موجود) | فحص `/api/health` بعد التبديل. |

على سيرفر staging: **مفتاح المزامنة هو الوحيد المتعلق بالإنتاج**، وهو مقيَّد بأمر التصدير فقط ولا يعطي shell. `.env` الخاص به كما هو (أسراره، شهادة Microsoft الخاصة به، `FIELD_ENCRYPTION_KEY` و`BLIND_INDEX_KEY` و`BETTER_AUTH_SECRET` مختلفة عن الإنتاج).

**Microsoft:** سجِّل redirect URI الخاص بـstaging (`https://<stg>/api/auth/callback/microsoft`) في Entra، ويفضَّل تطبيق (app registration) منفصل في الـtenant نفسه. `MICROSOFT_TENANT_ID` واحد للبيئتين حتى تتطابق البريدات. اختلاف السر بين البيئتين لا يؤثر (يُستخدم عند تبادل الكود فقط).

## 8. الـworkflow والسكريبتات (الملفات)

| ملف | عمل |
|---|---|
| `.github/workflows/sync-staging.yml` | `workflow_dispatch` فقط (+ `schedule` بعد الإصدار إلى `main`)، `environment: staging` للمهمة، `ssh` إلى staging يشغّل `sync-from-prod.sh`، ثم فحص `APP_URL/api/health`. `concurrency` يمنع تشغيلين معًا. أفعال GitHub مثبتة بـSHA كبقية الملفات، `permissions: contents: read`. |
| `scripts/server/sync-from-prod.sh` | يشغّله `cron` كل 6 ساعات أو الـworkflow؛ الخطوات 1–8 في القسم 3، `set -euo pipefail`، قفل `flock` ضد التداخل، تنظيف عند الخروج (`trap`) يمسح الملفات المؤقتة فقط، ويُبقي مفتاح المزامنة الدائم (D5). |
| `scripts/server/export-for-staging.sh` | يُنسخ إلى الإنتاج مع الـdeploy؛ التصدير فقط (القسم 4). |
| `scripts/server/sanitize-staging.sql` | القسم 5. |
| `scripts/server/setup-sync-user.sh` | يدوي مرة واحدة على الإنتاج: يخلق `arweqah_sync_ro`. |
| خدمة `mailpit` في compose الخاص بـstaging | Mailpit للبريد الاختباري، واجهته داخل الشبكة الداخلية أو خلف مصادقة. |
| `docs/sync-staging.md` | دليل التشغيل (الإعداد خطوة بخطوة، التدوير، الانتقال إلى GCP، الاستعادة عند الفشل). |

مراحل التبديل على staging: `dc stop api` ← `ALTER DATABASE … RENAME` ← `dc up -d api` ← انتظار `/api/health`. الاسم القديم يُحتفظ به مدة ساعة قبل الحذف للرجوع، فشل الفحص الصحي يعيده.

## 9. الاختبارات والتحقق

- **API e2e / سكريبت** (قاعدة 8 و15): اختبار بقاعدة اختبار خاصة `arweqah_platform_sync_test` (قاعدة 15: لكل مجموعة تكتب قاعدتها): يملأ موظفًا بالهوية والآيبان ومزوّد بريد بسر، يشغّل `sanitize-staging.sql`، ويتأكد أن كل عمود في القسم 5 فارغ أو مستبدل، وأن `audit_logs` لم يتغير، وأن الـ`users` والـ`employees.work_email` باقيان.
- اختبار الحارس: يفشل عند إضافة عمود `*_enc` وهمي غير مغطى، ويمر عند تغطيته.
- فحص الـmigrations: استعادة نسخة بمخطط `main` ثم تشغيل migrations `dev` عليها ينجح.
- فحص «لا إرسال»: بعد التنظيف المزوّد النشط الوحيد هو Mailpit؛ اختبار يؤكد أن رسالة دعوة أو إشعار تصل إلى Mailpit ولا تغادر السيرفر. يُفحص أولًا هل `integration_providers` يدعم SMTP عامًا (Mailpit) أم يلزم مزوّد جديد (`PROVIDER_FIELDS` ودليل «كيف أحصل على القيم» حسب قاعدة 10)؛ **إن لزم يُكتب في `integration-providers.md` قبل بنائه (قاعدة 12).**
- اختبار نقل الملفات: ملف مرفق على الإنتاج يظهر بعد المزامنة على staging، وفشل النقل في المنتصف لا يترك staging بلا ملفات.
- `flock` يمنع تشغيلين متداخلين لو تأخرت دورة أكثر من 6 ساعات.
- `shellcheck` على السكريبتات، و`actionlint` على الـworkflow.
- `npm run verify` (معمارية، تصميم، اختبارات، أمان) و`npm run security:check` يشمل الحارس الجديد.

## 10. المراحل

| # | المرحلة | الحالة |
|---|---|---|
| م1 | `sanitize-staging.sql` + اختباره + حارس `security-check` | مخطَّطة |
| م2 | `export-for-staging.sh` + `setup-sync-user.sh` + قيد المفتاح | مخطَّطة |
| م3 | `sync-from-prod.sh` (restore مؤقت، migrate، swap، رجوع عند الفشل) | مخطَّطة |
| م4 | `sync-staging.yml` + أسرار البيئات + `docs/sync-staging.md` | مخطَّطة |
| م4ب | Mailpit على staging + مزوّد SMTP (إن لزم) + نقل الملفات (D8) | مخطَّطة |
| م5 | أول تشغيل يدوي على staging الحقيقي، ثم `cron` كل 6 ساعات ومراقبة أول يومين | مخطَّطة |
| م6 | جدولة GitHub (`schedule`) بدل `cron`: بعد إصدار `dev` → `main` بكلمة المالك فقط (اختياري، `cron` كافٍ) | معلَّقة على المالك |
| م7 | الانتقال إلى Google Cloud: تغيير `export-for-staging.sh` فقط | عند الانتقال |

عند البناء: ملف قرار في `docs/decisions.md` (D1–D7)، و`README` (Run / Hosting)، وسطر في `CLAUDE.md` (Environment notes) إن لزم.

## 11. قرارات المالك (2026-11-17)

| السؤال | القرار |
|---|---|
| التردد | **كل 6 ساعات** (D7) |
| الملفات المرفقة | **تُنقل كلها** (D8، المخاطرة مسجلة) |
| بريد staging | **Mailpit** (D9) |
| إيميلات الموظفين و`audit_logs` | **تبقى كاملة** (D10) |
| مفتاح SSH | **يتولّد على staging** (D5) |

**يبقى مفتوحًا:** (1) هل `integration_providers` يدعم SMTP عامًا للـMailpit أم يلزم مزوّد جديد (يُفحص في م4ب). (2) مدة تعطل staging أثناء التبديل كل 6 ساعات: تُقاس في أول تشغيل؛ المطلوب إيقاف `api` ثوانٍ فقط.

## 12. سجل التنفيذ (ما تم)

- **2026-11-17:** كُتبت الخطة بعد نقاش مع المالك (معمارية السحب، عدم مشاركة المفاتيح، أثر Microsoft وأسرار المصادق). لم يُبنَ شيء ولم تُغيَّر قاعدة بيانات.
- **2026-11-17 (قرارات المالك):** كل 6 ساعات، الملفات تُنقل كلها، بريد Mailpit، الإيميلات و`audit_logs` كاملة، مفتاح SSH يتولّد على staging. حُدّثت الخطة (D5 وD7 إلى D10 والأقسام 5 و6 و7 و9 و10 و11). قاعدة 13 (`db:migrate` و`db:seed`) لا تنطبق لأنه لا كود تغيّر.
