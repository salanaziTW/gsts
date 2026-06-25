import crypto from "node:crypto";

const COOKIE_NAME = "simple_tasks_session";
const SESSION_DAYS = 7;

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
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

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function hmac(value) {
  const sharedPassword = process.env.SHARED_PASSWORD || "team123";
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret-change-me";
  return crypto.createHmac("sha256", `${secret}:${sharedPassword}`).update(value).digest("base64url");
}

function createSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + SESSION_DAYS * 24 * 60 * 60,
    scope: "shared-task-dashboard"
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${hmac(encodedPayload)}`;
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) return false;
  const [encodedPayload, signature] = token.split(".");
  const expected = hmac(encodedPayload);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  } catch {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    return payload.scope === "shared-task-dashboard" && payload.exp > now;
  } catch {
    return false;
  }
}

function authCookie(value, maxAge) {
  // نُبقي الكوكي كدعم إضافي، لكن الواجهة ستستخدم التوكن من localStorage حتى لا يتوقف الدخول بسبب مشاكل الكوكي.
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}

export default async function handler(request) {
  const method = request.method.toUpperCase();

  if (method === "GET") {
    const cookies = parseCookies(request);
    const authenticated = verifySessionToken(cookies[COOKIE_NAME]);
    return jsonResponse({ ok: true, authenticated });
  }

  if (method === "POST") {
    const body = await readJsonBody(request);
    const action = String(body.action || "login");

    if (action === "logout") {
      return jsonResponse(
        { ok: true, authenticated: false, message: "تم تسجيل الخروج." },
        200,
        { "set-cookie": authCookie("", 0) }
      );
    }

    const sharedPassword = process.env.SHARED_PASSWORD || "team123";
    const password = String(body.password || "").trim();

    if (password !== String(sharedPassword).trim()) {
      return jsonResponse({ ok: false, error: "كلمة المرور غير صحيحة." }, 401);
    }

    const token = createSessionToken();
    return jsonResponse(
      { ok: true, authenticated: true, token, message: "تم تسجيل الدخول بنجاح." },
      200,
      { "set-cookie": authCookie(token, SESSION_DAYS * 24 * 60 * 60) }
    );
  }

  return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
