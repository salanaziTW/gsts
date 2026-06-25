const crypto = require('crypto');

const DEFAULT_PASSWORD = 'team123';
const STORE_NAME = 'shared-task-dashboard';
const TASKS_KEY = 'tasks.json';
const VALID_STATUSES = new Set(['in_progress', 'pending', 'completed']);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SHARED_PASSWORD || DEFAULT_PASSWORD;
}

function sign(body) {
  return crypto
    .createHmac('sha256', getJwtSecret())
    .update(body)
    .digest('base64url');
}

function safeCompare(value, expected) {
  const valueBuffer = Buffer.from(String(value || ''));
  const expectedBuffer = Buffer.from(String(expected || ''));

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

function verifyToken(authHeader) {
  const header = String(authHeader || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [body, signature] = token.split('.');

  if (!body || !signature) return false;
  if (!safeCompare(signature, sign(body))) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (error) {
    return false;
  }

  return payload.role === 'shared-user' && Number(payload.exp) > Date.now();
}

async function getStore() {
  const blobs = await import('@netlify/blobs');
  return blobs.getStore({ name: STORE_NAME, consistency: 'strong' });
}

async function readTasks() {
  const store = await getStore();
  const saved = await store.get(TASKS_KEY, { type: 'json' });
  return Array.isArray(saved) ? saved : [];
}

async function writeTasks(tasks) {
  const store = await getStore();
  await store.setJSON(TASKS_KEY, tasks);
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch (error) {
    return null;
  }
}

function cleanTask(input, existingTask = {}) {
  const title = String(input.title || '').trim().slice(0, 120);
  const description = String(input.description || '').trim().slice(0, 500);
  const dueDate = String(input.dueDate || '').trim();
  const status = VALID_STATUSES.has(input.status) ? input.status : 'in_progress';

  if (!title) {
    throw new Error('عنوان المهمة مطلوب.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error('تاريخ التسليم غير صحيح.');
  }

  return {
    ...existingTask,
    title,
    description,
    dueDate,
    status
  };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDate = a.dueDate || '9999-12-31';
    const bDate = b.dueDate || '9999-12-31';
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (!verifyToken(event.headers.authorization || event.headers.Authorization)) {
    return json(401, { message: 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.' });
  }

  try {
    if (event.httpMethod === 'GET') {
      const tasks = await readTasks();
      return json(200, { tasks: sortTasks(tasks) });
    }

    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      if (!body) return json(400, { message: 'البيانات المرسلة غير صحيحة.' });

      const now = new Date().toISOString();
      const task = cleanTask(body);
      task.id = crypto.randomUUID();
      task.createdAt = now;
      task.updatedAt = now;

      const tasks = await readTasks();
      const nextTasks = [task, ...tasks];
      await writeTasks(nextTasks);

      return json(201, { task });
    }

    if (event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return json(400, { message: 'البيانات المرسلة غير صحيحة.' });

      const id = String(body.id || '').trim();
      if (!id) return json(400, { message: 'معرف المهمة مطلوب.' });

      const tasks = await readTasks();
      const index = tasks.findIndex((task) => task.id === id);
      if (index === -1) return json(404, { message: 'المهمة غير موجودة.' });

      const updated = cleanTask(body, tasks[index]);
      updated.id = id;
      updated.createdAt = tasks[index].createdAt || new Date().toISOString();
      updated.updatedAt = new Date().toISOString();

      const nextTasks = [...tasks];
      nextTasks[index] = updated;
      await writeTasks(nextTasks);

      return json(200, { task: updated });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json(400, { message: 'معرف المهمة مطلوب.' });

      const tasks = await readTasks();
      const nextTasks = tasks.filter((task) => task.id !== id);

      if (nextTasks.length === tasks.length) {
        return json(404, { message: 'المهمة غير موجودة.' });
      }

      await writeTasks(nextTasks);
      return json(200, { ok: true });
    }

    return json(405, { message: 'Method not allowed' });
  } catch (error) {
    return json(500, { message: error.message || 'حدث خطأ في الخادم.' });
  }
};
