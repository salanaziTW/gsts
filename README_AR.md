# لوحة المهام المشتركة على Netlify

نسخة بسيطة لإدارة المهام باستخدام:

- صفحة HTML واحدة
- Netlify Functions
- Netlify Blobs
- كلمة مرور مشتركة واحدة

## مهم جدًا

هذه النسخة تستخدم طريقتين للدخول:

1. ترجع دالة تسجيل الدخول توكن للواجهة ويتم حفظه في `localStorage`.
2. وتضع كوكي كدعم إضافي.

هذا يجعل الدخول أكثر ثباتًا إذا لم يعمل الكوكي في بعض المتصفحات أو الإعدادات.

## طريقة النشر

1. ارفع ملفات المشروع إلى GitHub.
2. اربط المستودع مع Netlify.
3. تأكد أن الإعدادات كالتالي:

```txt
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

أو اترك Netlify يقرأها من `netlify.toml`.

## متغيرات البيئة

من Netlify:

```txt
Project configuration > Environment variables
```

أضف:

```txt
SHARED_PASSWORD=كلمة_مرور_قوية
JWT_SECRET=نص_سري_طويل_وعشوائي
```

بعد إضافة المتغيرات نفذ:

```txt
Deploys > Trigger deploy > Clear cache and deploy site
```

## كلمة المرور الافتراضية

إذا لم تضف `SHARED_PASSWORD`، ستكون كلمة المرور:

```txt
team123
```

لا تستخدمها في التشغيل الفعلي.

## إذا لم تعمل صفحة الدخول

افتح الرابط التالي مباشرة بعد استبدال نطاق موقعك:

```txt
https://YOUR-SITE.netlify.app/.netlify/functions/auth
```

إذا ظهرت استجابة JSON فهذا يعني أن الدالة تعمل.

ثم جرّب:

```txt
https://YOUR-SITE.netlify.app/api/auth
```

إذا الرابط الأول يعمل والثاني لا يعمل، فالمشكلة في redirects أو في أن `netlify.toml` ليس في جذر المشروع.

## ملاحظات

لا تضف `NETLIFY_SITE_ID` ولا `NETLIFY_AUTH_TOKEN` إلا إذا كنت تستخدم Blobs من خارج Netlify Functions. هذه النسخة تستخدم التهيئة التلقائية داخل Netlify.
