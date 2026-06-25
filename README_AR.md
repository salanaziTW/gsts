# لوحة المهام المشتركة على Netlify

مشروع بسيط لإدارة المهام بكلمة مرور واحدة مشتركة.

أي شخص يملك كلمة المرور يستطيع:

- مشاهدة كل المهام
- إضافة مهمة
- تعديل أي مهمة
- حذف أي مهمة
- تغيير حالة أي مهمة

## مكونات المشروع

- واجهة عربية جاهزة داخل مجلد `public`
- دالة تسجيل الدخول داخل `netlify/functions/auth.js`
- دالة إدارة المهام داخل `netlify/functions/tasks.js`
- حفظ المهام باستخدام Netlify Blobs
- لا يوجد مستخدمون ولا صلاحيات ولا مدير مهام

## كلمة المرور الافتراضية

كلمة المرور الافتراضية للتجربة:

```txt
team123
```

مهم جدًا: غيّر كلمة المرور من إعدادات Netlify قبل استخدام الموقع فعليًا.

## طريقة النشر الأسهل

الأفضل نشر المشروع عن طريق GitHub أو Netlify CLI، لأن المشروع يحتوي على Netlify Functions.

### الطريقة الأولى: GitHub

1. ارفع ملفات المشروع إلى مستودع GitHub جديد.
2. افتح Netlify.
3. اختر Add new site.
4. اختر Import an existing project.
5. اربط المستودع.
6. تأكد أن الإعدادات كالتالي:

```txt
Build command: اتركه فارغًا
Publish directory: public
Functions directory: netlify/functions
```

7. من إعدادات الموقع في Netlify أضف Environment Variables:

```txt
SHARED_PASSWORD=اكتب-كلمة-مرور-قوية
JWT_SECRET=اكتب-نص-سري-طويل
```

8. اضغط Deploy.

### الطريقة الثانية: Netlify CLI

من داخل مجلد المشروع شغّل:

```bash
npm install
npx netlify login
npx netlify init
npx netlify deploy --prod
```

ثم أضف المتغيرات من لوحة Netlify:

```txt
SHARED_PASSWORD=اكتب-كلمة-مرور-قوية
JWT_SECRET=اكتب-نص-سري-طويل
```

ثم أعد النشر:

```bash
npx netlify deploy --prod
```

## ملاحظة مهمة عن السحب والإفلات

رفع ملفات الواجهة بالسحب والإفلات قد ينشر الموقع كصفحات ثابتة فقط، لكنه قد لا ينشر Netlify Functions. لذلك استخدم GitHub أو Netlify CLI.

## تعديل اسم الموقع

يمكنك تعديل الاسم من ملف:

```txt
public/index.html
```

ابحث عن:

```txt
لوحة المهام المشتركة
```

وقم بتغييرها للاسم الذي تريده.

## تعديل الألوان

الألوان موجودة في بداية ملف:

```txt
public/styles.css
```

داخل `:root`.

## هيكلة الملفات

```txt
netlify-shared-task-dashboard/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ netlify/
│  └─ functions/
│     ├─ auth.js
│     └─ tasks.js
├─ netlify.toml
├─ package.json
├─ .env.example
└─ README_AR.md
```

## تنبيه أمني بسيط

هذا النظام بسيط ومناسب لفريق صغير. لا تستخدمه لتخزين معلومات حساسة جدًا. كل من يعرف كلمة المرور يستطيع إدارة كل المهام.
