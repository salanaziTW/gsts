# لوحة المهام المشتركة على Netlify

مشروع بسيط جدًا لإدارة المهام باستخدام:

- صفحة HTML واحدة
- Netlify Functions
- Netlify Blobs
- كلمة مرور مشتركة واحدة

لا توجد حسابات مستخدمين، ولا صلاحيات، ولا قاعدة بيانات خارجية.
كل شخص يملك كلمة المرور يستطيع مشاهدة وإضافة وتعديل وحذف كل المهام.

## الملفات

```txt
public/index.html
netlify/functions/auth.mjs
netlify/functions/tasks.mjs
netlify.toml
package.json
.env.example
```

## كلمة المرور الافتراضية

```txt
team123
```

لا تستخدمها في التشغيل الفعلي. غيّرها من Netlify Environment Variables.

## متغيرات البيئة المطلوبة

من داخل Netlify:

```txt
Project configuration > Environment variables
```

أضف:

```txt
SHARED_PASSWORD=اكتب_كلمة_مرور_قوية
JWT_SECRET=اكتب_نص_سري_طويل_وعشوائي
```

مثال:

```txt
SHARED_PASSWORD=MyTeamPassword2026
JWT_SECRET=my-long-random-secret-change-this-987654321
```

## مهم جدًا بخصوص Netlify Blobs

لا تضف هذه المتغيرات إلا إذا كنت تعرف لماذا تحتاجها:

```txt
NETLIFY_SITE_ID
NETLIFY_AUTH_TOKEN
```

إذا ظهرت لديك أخطاء 401 في Netlify Blobs، احذف المتغيرين أعلاه إن كانا موجودين، ثم أعد النشر من جديد.
هذه النسخة تعتمد على التهيئة التلقائية داخل Netlify Functions.

## طريقة النشر عبر GitHub

1. فك ضغط الملف.
2. أنشئ مستودع GitHub جديد.
3. ارفع محتويات المجلد إلى المستودع.
4. افتح Netlify.
5. اختر Add new project.
6. اختر Import from GitHub.
7. اختر المستودع.
8. تأكد من الإعدادات:

```txt
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

9. اضغط Deploy.
10. أضف Environment Variables:

```txt
SHARED_PASSWORD
JWT_SECRET
```

11. من تبويب Deploys اختر:

```txt
Trigger deploy > Clear cache and deploy site
```

12. افتح الموقع وسجل الدخول.

## وظائف الداشبورد

- تسجيل دخول بكلمة مرور مشتركة
- إضافة مهمة
- تعديل مهمة
- حذف مهمة
- تغيير الحالة من الكرت مباشرة
- البحث في العنوان والوصف
- عرض المهام في 3 أعمدة:
  - تحت التنفيذ
  - معلق
  - مكتمل
- عداد للمهام المتأخرة حسب تاريخ التسليم

## حالات المهمة

```txt
in_progress = تحت التنفيذ
pending = معلق
completed = مكتمل
```

## API الداخلي

```txt
GET    /api/auth
POST   /api/auth
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks
DELETE /api/tasks?id=TASK_ID
```

## ملاحظة مهمة

هذا المشروع مناسب لفريق صغير واستخدام بسيط. إذا أصبح عدد المستخدمين كبيرًا أو أصبحت التعديلات متزامنة بكثافة، يفضل الانتقال لاحقًا إلى Supabase أو قاعدة Postgres.
