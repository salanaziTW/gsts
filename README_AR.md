# اختبار Netlify Blobs

هذا مشروع صغير جدًا لاختبار Netlify Blobs فقط.

## ماذا يفعل؟

- يحفظ نصًا بسيطًا في Netlify Blobs.
- يقرأ النص المحفوظ.
- يحذف النص المحفوظ.

## الملفات المهمة

```txt
public/index.html
netlify/functions/blob-test.mjs
netlify.toml
package.json
```

## طريقة النشر

1. ارفع هذا المشروع إلى GitHub.
2. في Netlify اختر Add new project.
3. اختر Import from GitHub.
4. اختر المستودع.
5. تأكد من الإعدادات التالية:

```txt
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

6. انشر الموقع.
7. افتح الرابط واضغط حفظ، ثم قراءة، ثم حذف.

## إذا ظهر خطأ environment

إذا ظهرت رسالة مثل:

```txt
The environment has not been configured to use Netlify Blobs
```

أضف متغيرات البيئة التالية في Netlify:

```txt
NETLIFY_SITE_ID=Project ID
NETLIFY_AUTH_TOKEN=Personal Access Token
```

ثم أعد النشر.

## أين أجد Project ID؟

من داخل Netlify:

```txt
Project configuration > General > Project information > Project ID
```

## ملاحظة

هذا المشروع لا يحتوي على تسجيل دخول، ولا يستخدم قاعدة بيانات خارجية. الهدف منه اختبار Netlify Blobs فقط.
