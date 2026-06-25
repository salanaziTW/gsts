import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const COOKIE_NAME = "simple_tasks_session";
const STORE_NAME = "simple-shared-tasks";
const BLOB_KEY = "tasks-data";
const VALID_STATUSES = new Set(["in_progress", "pending", "completed"]);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function hmac(value) {
  const sharedPassword = process.env.SHARED_PASSWORD || "team123";
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret-change-me";
  return crypto.createHmac("sha256", `${secret}:${sharedPassword}`).update(value).digest("base64url");
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

function requireAuth(request) {
  const cookies = parseCookies(request);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getBlobStore() {
  // لا نمرر siteID أو token يدويًا.
  // داخل Netlify Functions يتم تمرير إعدادات Netlify Blobs تلقائيًا.
  return getStore(STORE_NAME);
}

async function loadTasks() {
  const store = getBlobStore();
  const saved = await store.get(BLOB_KEY, { type: "json" });

  if (!saved) {
    return { tasks: [], updatedAt: null };
  }

  if (Array.isArray(saved)) {
    return { tasks: saved, updatedAt: null };
  }

  return {
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
    updatedAt: saved.updatedAt || null
  };
}

async function saveTasks(tasks) {
  const store = getBlobStore();
  const payload = {
    tasks,
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await store.setJSON(BLOB_KEY, payload);
  return payload;
}

function normalizeTask(input, existing = {}) {
  const title = String(input.title ?? existing.title ?? "").trim();
  const description = String(input.description ?? existing.description ?? "").trim();
  const dueDate = String(input.dueDate ?? existing.dueDate ?? "").trim();
  const status = String(input.status ?? existing.status ?? "in_progress").trim();

  if (!title) {
    return { error: "عنوان المهمة مطلوب." };
  }

  if (title.length > 120) {
    return { error: "عنوان المهمة طويل جدًا. الحد الأقصى 120 حرفًا." };
  }

  if (description.length > 500) {
    return { error: "الوصف طويل جدًا. الحد الأقصى 500 حرف." };
  }

  if (!VALID_STATUSES.has(status)) {
    return { error: "حالة المهمة غير صحيحة." };
  }

  return {
    title,
    description,
    dueDate,
    status
  };
}

function buildSummary(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summary = {
    total: tasks.length,
    in_progress: 0,
    pending: 0,
    completed: 0,
    overdue: 0
  };

  for (const task of tasks) {
    if (summary[task.status] !== undefined) summary[task.status] += 1;

    if (task.status !== "completed" && task.dueDate) {
      const due = new Date(`${task.dueDate}T00:00:00`);
      if (!Number.isNaN(due.getTime()) && due < today) summary.overdue += 1;
    }
  }

  return summary;
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const aDate = a.dueDate || "9999-12-31";
    const bDate = b.dueDate || "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export default async function handler(request) {
  try {
    if (!requireAuth(request)) {
      return jsonResponse({ ok: false, error: "غير مصرح. الرجاء تسجيل الدخول." }, 401);
    }

    const method = request.method.toUpperCase();

    if (method === "GET") {
      const data = await loadTasks();
      const tasks = sortTasks(data.tasks);
      return jsonResponse({
        ok: true,
        tasks,
        summary: buildSummary(tasks),
        updatedAt: data.updatedAt
      });
    }

    if (method === "POST") {
      const body = await readJsonBody(request);
      const normalized = normalizeTask(body);
      if (normalized.error) return jsonResponse({ ok: false, error: normalized.error }, 400);

      const data = await loadTasks();
      const now = new Date().toISOString();
      const task = {
        id: crypto.randomUUID(),
        ...normalized,
        createdAt: now,
        updatedAt: now
      };

      const saved = await saveTasks([task, ...data.tasks]);
      const tasks = sortTasks(saved.tasks);
      return jsonResponse({ ok: true, action: "created", task, tasks, summary: buildSummary(tasks), updatedAt: saved.updatedAt }, 201);
    }

    if (method === "PATCH" || method === "PUT") {
      const body = await readJsonBody(request);
      const id = String(body.id || "").trim();
      if (!id) return jsonResponse({ ok: false, error: "معرف المهمة مطلوب." }, 400);

      const data = await loadTasks();
      const index = data.tasks.findIndex((task) => task.id === id);
      if (index === -1) return jsonResponse({ ok: false, error: "المهمة غير موجودة." }, 404);

      const normalized = normalizeTask(body, data.tasks[index]);
      if (normalized.error) return jsonResponse({ ok: false, error: normalized.error }, 400);

      const updatedTask = {
        ...data.tasks[index],
        ...normalized,
        updatedAt: new Date().toISOString()
      };

      const nextTasks = [...data.tasks];
      nextTasks[index] = updatedTask;

      const saved = await saveTasks(nextTasks);
      const tasks = sortTasks(saved.tasks);
      return jsonResponse({ ok: true, action: "updated", task: updatedTask, tasks, summary: buildSummary(tasks), updatedAt: saved.updatedAt });
    }

    if (method === "DELETE") {
      const url = new URL(request.url);
      const id = String(url.searchParams.get("id") || "").trim();
      if (!id) return jsonResponse({ ok: false, error: "معرف المهمة مطلوب للحذف." }, 400);

      const data = await loadTasks();
      const exists = data.tasks.some((task) => task.id === id);
      if (!exists) return jsonResponse({ ok: false, error: "المهمة غير موجودة." }, 404);

      const nextTasks = data.tasks.filter((task) => task.id !== id);
      const saved = await saveTasks(nextTasks);
      const tasks = sortTasks(saved.tasks);
      return jsonResponse({ ok: true, action: "deleted", deletedId: id, tasks, summary: buildSummary(tasks), updatedAt: saved.updatedAt });
    }

    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error?.message || "Unknown error",
      diagnosis: "إذا ظهر خطأ 401 من Netlify Blobs، احذف NETLIFY_SITE_ID و NETLIFY_AUTH_TOKEN من Environment Variables ثم أعد النشر. هذه النسخة تستخدم التهيئة التلقائية داخل Netlify Functions.",
      functionEnvironment: {
        hasNETLIFY: Boolean(process.env.NETLIFY),
        hasSITE_ID: Boolean(process.env.SITE_ID),
        hasURL: Boolean(process.env.URL),
        hasManualNetlifySiteId: Boolean(process.env.NETLIFY_SITE_ID),
        hasManualNetlifyAuthToken: Boolean(process.env.NETLIFY_AUTH_TOKEN)
      }
    }, 500);
  }
}
