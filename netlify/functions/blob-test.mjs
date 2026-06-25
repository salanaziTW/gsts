import { getStore } from "@netlify/blobs";

const STORE_NAME = "simple-blobs-test";
const BLOB_KEY = "demo-message";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getBlobStore() {
  const manualSiteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const manualToken = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN;

  if (manualSiteID && manualToken) {
    return getStore({
      name: STORE_NAME,
      siteID: manualSiteID,
      token: manualToken,
      consistency: "strong"
    });
  }

  return getStore({
    name: STORE_NAME,
    consistency: "strong"
  });
}

export default async function handler(request) {
  const store = getBlobStore();
  const method = request.method.toUpperCase();

  try {
    if (method === "GET") {
      const saved = await store.get(BLOB_KEY, {
        type: "json",
        consistency: "strong"
      });

      return jsonResponse({
        ok: true,
        action: "read",
        store: STORE_NAME,
        key: BLOB_KEY,
        data: saved || null,
        note: saved ? "تمت قراءة البيانات من Netlify Blobs بنجاح." : "لا توجد بيانات محفوظة بعد."
      });
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const message = String(body.message || "").trim();

      if (!message) {
        return jsonResponse({
          ok: false,
          error: "الرجاء كتابة نص لاختبار الحفظ."
        }, 400);
      }

      const payload = {
        message,
        savedAt: new Date().toISOString(),
        source: "Netlify Blobs"
      };

      await store.setJSON(BLOB_KEY, payload);

      const saved = await store.get(BLOB_KEY, {
        type: "json",
        consistency: "strong"
      });

      return jsonResponse({
        ok: true,
        action: "write",
        store: STORE_NAME,
        key: BLOB_KEY,
        data: saved,
        note: "تم حفظ البيانات في Netlify Blobs بنجاح."
      });
    }

    if (method === "DELETE") {
      await store.delete(BLOB_KEY);

      return jsonResponse({
        ok: true,
        action: "delete",
        store: STORE_NAME,
        key: BLOB_KEY,
        data: null,
        note: "تم حذف البيانات من Netlify Blobs بنجاح."
      });
    }

    return jsonResponse({
      ok: false,
      error: "Method not allowed. استخدم GET أو POST أو DELETE."
    }, 405);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error?.message || "Unknown error",
      help: "إذا ظهر خطأ environment، أضف NETLIFY_SITE_ID و NETLIFY_AUTH_TOKEN من إعدادات Netlify، ثم أعد النشر."
    }, 500);
  }
}
