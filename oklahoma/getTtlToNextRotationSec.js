// src/utils/ttlToNextRotation.js
const { DateTime } = require('luxon');
function getTtlToNextRotationSec(minuteOffset = 5) {
    // Поточний час в таймзоні Oklahoma / Central
  const now = DateTime.now().setZone('America/Chicago');

  // Сьогоднішня 00:05 (або 00:minuteOffset)
  let target = now.set({
    hour: 0,
    minute: minuteOffset,
    second: 0,
    millisecond: 0,
  });

  // Якщо ми вже ПІСЛЯ цієї 00:05 → беремо наступну добу
  if (target <= now) {
    target = target.plus({ days: 1 });
  }

  const diffMs = target.toMillis() - now.toMillis();
  const diffSec = Math.floor(diffMs / 1000);

  console.log('[OKLA DEBUG] now:   ', now.toISO());
  console.log('[OKLA DEBUG] target:', target.toISO());
  console.log('[OKLA DEBUG] ttlSec:', diffSec);
   return Math.max(diffSec, 60); // мінімум 60 сек, щоб не було 0
}
module.exports = { getTtlToNextRotationSec };