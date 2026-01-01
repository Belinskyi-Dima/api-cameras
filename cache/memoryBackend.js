// src/cache/memoryBackend.js

// Простий об'єкт в пам'яті
const store = Object.create(null);

// універсальні методи
// async function setJson(key, value, ttl) {
//   store[key] = value;
// }
async function setJson(key, value, ttlSec) {
  const expiresAt = ttlSec && Number.isFinite(ttlSec)
    ? Date.now() + ttlSec * 1000
    : null;

  store[key] = { value, expiresAt };
}
// async function getJson(key) {
//   return store[key] ?? null;
// }
async function getJson(key) {
  const entry = store[key];
  if (!entry) return null;

  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    // протухло – видаляємо і повертаємо null
    delete store[key];
    return null;
  }

  return entry.value;
}
async function del(key) {
  delete store[key];
}

module.exports = {
  type: 'memory',
  setJson,
  getJson,
  del,
};
