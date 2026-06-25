const crypto = require('crypto');

const TOKEN_DAYS = 7;
const DEFAULT_PASSWORD = 'team123';

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

function getSharedPassword() {
  return process.env.SHARED_PASSWORD || DEFAULT_PASSWORD;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SHARED_PASSWORD || DEFAULT_PASSWORD;
}

function safeCompare(value, expected) {
  const valueBuffer = Buffer.from(String(value || ''));
  const expectedBuffer = Buffer.from(String(expected || ''));

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { message: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { message: 'البيانات المرسلة غير صحيحة.' });
  }

  const password = String(payload.password || '');

  if (!safeCompare(password, getSharedPassword())) {
    return json(401, { message: 'كلمة المرور غير صحيحة.' });
  }

  const now = Date.now();
  const token = signToken({
    role: 'shared-user',
    iat: now,
    exp: now + TOKEN_DAYS * 24 * 60 * 60 * 1000
  });

  return json(200, { token });
};
