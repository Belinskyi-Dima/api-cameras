// src/cache/backend.js
const backendName = (process.env.CACHE_BACKEND || 'memory').toLowerCase();

let impl;

if (backendName === 'redis') {
  try {
    impl = require('./redisBackend'); // нижче покажу
    console.log('[cache] backend=redis');
  } catch (e) {
    console.log('[cache] redis backend failed, fallback to memory:', e.message);
    impl = require('./memoryBackend');
  }
} else {
  console.log('[cache] backend=memory');
  impl = require('./memoryBackend');
}

module.exports = impl;
