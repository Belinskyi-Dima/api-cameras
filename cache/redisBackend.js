// src/cache/redisBackend.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

redis.on('error', (err) => {
  console.error('[cache] Redis error:', err);
});

// зберігаємо весь payload як JSON рядок
async function setJson(key, value, ttlSec) {
  const json = JSON.stringify(value);

  if (ttlSec && Number.isFinite(ttlSec)) {
    // TTL в секундах
    await redis.set(key, json, 'EX', ttlSec);
  } else {
    await redis.set(key, json);
  }
}

async function getJson(key) {
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('[cache] Failed to parse JSON for key', key, e);
    return null;
  }
}

async function del(key) {
  await redis.del(key);
}

module.exports = {
  type: 'redis',
  setJson,
  getJson,
  del,
};
