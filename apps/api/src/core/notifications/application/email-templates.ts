import { localizedVariable, variable } from '../../templates/domain/rules/define-template';
import type { TemplateDefinition } from '../../templates/domain/types/template.types';

export const INVITATION_TEMPLATE = 'auth.invitation';
export const LOGIN_CODE_TEMPLATE = 'auth.login_code';
export const NOTIFICATION_EMAIL_TEMPLATE = 'notification.email';

const NAME = localizedVariable('name', ['اسم المستلم', 'The recipient’s name'], ['سارة أحمد', 'Sara Ahmed']);
const LINK = (description: [string, string], example: string, required: boolean) => variable('link', description, example, required);

/** The e-mails of the platform: the activation invitation, and the e-mail copy that carries every notification. */
export const EMAIL_TEMPLATES: TemplateDefinition[] = [
  {
    key: INVITATION_TEMPLATE,
    kind: 'email',
    area: 'sign_in',
    nameAr: 'دعوة تفعيل الحساب',
    nameEn: 'Account activation invitation',
    descriptionAr: 'تُرسل لموظف جديد (أو عند طلب رابط جديد) ليربط تطبيق المصادقة ويفعّل حسابه',
    descriptionEn: 'Sent to a new employee (or when a new link is requested) to link the authenticator app and activate the account',
    variables: [NAME, LINK(['رابط التفعيل (يحمله الزر)', 'The activation link (the button carries it)'], 'https://platform.arweqah.sa/enroll/abc123', true)],
    defaults: {
      ar: { title: 'فعّل حسابك في منصة أروقة', preheader: 'رابط تفعيل حسابك صالح 72 ساعة', buttonText: 'ربط تطبيق المصادقة', body: '<p>مرحبًا {{name}}،</p><p>تم إنشاء حساب لك في منصة أروقة. اضغط الزر أدناه خلال 72 ساعة لربط تطبيق المصادقة (Microsoft أو Google Authenticator).</p><p>يمكنك أيضًا الدخول بحساب Microsoft الخاص بالعمل.</p>' },
      en: { title: 'Activate your Arweqah account', preheader: 'Your activation link is valid for 72 hours', buttonText: 'Link authenticator app', body: '<p>Hello {{name}},</p><p>An Arweqah Platform account was created for you. Press the button below within 72 hours to link your authenticator app (Microsoft or Google Authenticator).</p><p>You can also sign in with your Microsoft work account.</p>' },
      colors: { band: 'petrol', button: 'petrol' },
    },
  },
  {
    key: LOGIN_CODE_TEMPLATE,
    kind: 'email',
    area: 'sign_in',
    nameAr: 'رمز الدخول بالبريد',
    nameEn: 'E-mailed sign-in code',
    descriptionAr: 'يُرسل عندما يختار الموظف رمز البريد بدل رمز تطبيق المصادقة؛ صالح 10 دقائق ويُستعمل مرة واحدة',
    descriptionEn: 'Sent when an employee chooses the e-mailed code instead of the authenticator app code; valid for 10 minutes and used once',
    variables: [NAME, { ...variable('code', ['رمز الدخول (6 أرقام)', 'The sign-in code (6 digits)'], '482915', true) }],
    defaults: {
      ar: { title: 'رمز الدخول إلى منصة أروقة', preheader: 'رمزك صالح 10 دقائق', buttonText: '', body: '<p>مرحبًا {{name}}،</p><p>رمز الدخول الخاص بك:</p><p><strong>{{code}}</strong></p><p>صالح 10 دقائق ويُستعمل مرة واحدة. إن لم تطلبه فتجاهل هذه الرسالة ولا تشاركه مع أحد.</p>' },
      en: { title: 'Your Arweqah sign-in code', preheader: 'Your code is valid for 10 minutes', buttonText: '', body: '<p>Hello {{name}},</p><p>Your sign-in code:</p><p><strong>{{code}}</strong></p><p>It is valid for 10 minutes and can be used once. If you did not ask for it, ignore this message and do not share it with anyone.</p>' },
      colors: { band: 'petrol', button: 'petrol' },
    },
  },
  {
    key: NOTIFICATION_EMAIL_TEMPLATE,
    kind: 'email',
    area: 'notifications',
    nameAr: 'نسخة الإشعار بالبريد',
    nameEn: 'E-mail copy of a notification',
    descriptionAr: 'الإطار الذي يحمل كل إشعار يُرسل بالبريد (التذاكر والمهام…)؛ نص الإشعار نفسه من قوالب الإشعارات',
    descriptionEn: 'The frame that carries every notification sent by e-mail (tickets, tasks…); the notice’s own wording comes from the notification templates',
    variables: [
      NAME,
      localizedVariable('title', ['عنوان الإشعار', 'The notification title'], ['مهمة جديدة TSK-000045', 'New task TSK-000045']),
      { ...localizedVariable('body', ['نص الإشعار', 'The notification text'], ['أُسندت إليك المهمة TSK-000045.', 'Task TSK-000045 was assigned to you.']), required: true },
      LINK(['رابط الصفحة المعنية (يحمله الزر)', 'The link to the page concerned (the button carries it)'], 'https://platform.arweqah.sa/tasks/1', false),
    ],
    defaults: {
      ar: { title: '{{title}}', preheader: '', buttonText: 'فتح في المنصة', body: '<p>{{body}}</p>' },
      en: { title: '{{title}}', preheader: '', buttonText: 'Open in the platform', body: '<p>{{body}}</p>' },
      colors: { band: 'petrol', button: 'petrol' },
    },
  },
];
