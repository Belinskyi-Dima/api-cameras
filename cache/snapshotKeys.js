// src/cache/snapshotKeys.js
const crypto = require('crypto');

function makeIllinoisSnapshotKey(state ,id, originUrl) {
  const h = crypto
    .createHash('md5')
    .update(`${state}:${id}:${originUrl}`)
    .digest('hex');
  return `snapshot:il:${h}`;
}

module.exports = {
  makeIllinoisSnapshotKey,
};
