// src/cache/roadCamerasCache.js
const backend = require('./backend');

// префікс для ключів
const PREFIX = 'road:cameras:'; // буде типу road:cameras:oklahoma

function makeKey(stateCode) {
  return `${PREFIX}${stateCode.toLowerCase()}`;
}

/**
 * payload формат:
 * { updatedAt: ISOString, items: [...] }
 */
async function saveStateCameras(stateCode, payload, ttlSec) {
  const key = makeKey(stateCode);
  await backend.setJson(key, payload, ttlSec);
  console.log(`[cache] saved cameras for ${stateCode} via ${backend.type}, ttlSec=${ttlSec}`)
}

async function loadStateCameras(stateCode) {
  const key = makeKey(stateCode);
  return backend.getJson(key);
}

module.exports = {
  saveStateCameras,
  loadStateCameras,
};
