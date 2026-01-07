// src/controllers/penssyilvania/index_hls.js
const https = require('https');
const axios = require('axios');

// твій cache backend (memory/redis) — вже є в проекті
const cache = require('../cache/backend');

// ---------------- Semaphore ----------------
function createSemaphore(max) {
  let active = 0;
  const queue = [];
  return async function withLimit(fn) {
    if (active >= max) await new Promise((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      const next = queue.shift();
      if (next) next();
    }
  };
}

// ---------------- Lock helpers (Redis lock через cache.tryLock/unlock) ----------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function lockToken() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function withDistributedLock({
  lockKey,
  ttlMs = 8000,
  waitMs = 4000,
  pollMs = 80,
  fn,
}) {
  // якщо backend не redis — tryLock/unlock може не існувати
  if (typeof cache.tryLock !== 'function' || typeof cache.unlock !== 'function') {
    // fallback: просто виконуємо (для single instance / memory backend)
    return await fn();
  }

  const token = lockToken();
  const deadline = Date.now() + waitMs;

  while (true) {
    const ok = await cache.tryLock(lockKey, token, ttlMs);
    if (ok) break;

    if (Date.now() > deadline) {
      throw new Error(`Lock timeout: ${lockKey}`);
    }
    await sleep(pollMs);
  }

  try {
    return await fn();
  } finally {
    try {
      await cache.unlock(lockKey, token);
    } catch {}
  }
}

// ---------------- Config ----------------
const PA_META_CONC = Number(process.env.PA_META_CONC || 2); // index/xflow/token
const PA_SEG_CONC = Number(process.env.PA_SEG_CONC || 20); // segments
const PA_DIRECT_SEGMENTS = (process.env.PA_DIRECT_SEGMENTS ?? '1') === '1'

const metaLimit = createSemaphore(PA_META_CONC);
const segLimit = createSemaphore(PA_SEG_CONC);

const paHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  keepAliveMsecs: 10_000,
  maxSockets: 100,
});

const commonHeaders = {
  accept: '*/*',
  'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

function paHeaders(extra = {}) {
  return {
    ...commonHeaders,
    origin: 'https://www.fl511.com',
    referer: 'https://www.fl511.com/',
    'accept-encoding': 'gzip, deflate, br, zstd',
    ...extra,
  };
}

function normalizeOriginUrl(originUrl) {
  if (!originUrl) return originUrl;
  return originUrl.endsWith('/') ? originUrl : originUrl + '/';
}

async function httpGetText(url, timeoutMs) {
  return metaLimit(() =>
    axios.get(url, {
      httpsAgent: paHttpsAgent,
      headers: paHeaders(),
      responseType: 'text',
      timeout: timeoutMs,
      validateStatus: () => true,
    }),
  );
}

async function httpPostText(url, data, timeoutMs) {
  return metaLimit(() =>
    axios.post(url, data, {
      httpsAgent: paHttpsAgent,
      headers: paHeaders({ 'content-type': 'application/json' }),
      responseType: 'text',
      timeout: timeoutMs,
      validateStatus: () => true,
    }),
  );
}

// ---------------- Redis cache wrappers ----------------
// у твоєму redisBackend ти додав setRaw/getRaw
async function cacheGetRaw(key) {
  if (typeof cache.getRaw === 'function') return await cache.getRaw(key);
  // fallback: якщо нема getRaw — зберігаємо/читаємо як JSON рядок
  const v = await cache.getJson(key);
  return v == null ? null : String(v);
}
async function cacheSetRaw(key, value, ttlSec) {
  if (typeof cache.setRaw === 'function') return await cache.setRaw(key, value, ttlSec);
  return await cache.setJson(key, String(value), ttlSec);
}

const DISABLED = '__PA_SECURE_TOKEN_DISABLED__';

// ---------------- Token (shared між інстансами) ----------------
async function getFlSecureToken(id, originUrl) {
  const key = `fl:token:${id}`;

  const cached = await cacheGetRaw(key);
  if (cached !== null) {
    console.log('[FL HIT flTokenCache] :', cached);
    if (cached === DISABLED) return '';
    return cached; // "?token=..."
  }
  console.log('[FL MISS flTokenCache] :', cached);
  const lockKey = `lock:${key}`;

  return await withDistributedLock({
    lockKey,
    ttlMs: 6000,
    waitMs: 4000,
    fn: async () => {
      // після lock — перевір ще раз
      const cached2 = await cacheGetRaw(key);
      if (cached2 !== null) {
        if (cached2 === DISABLED) return '';
        return cached2;
      }

      // 1) GetVideoUrl
      const url1 = `https://www.fl511.com/Camera/GetVideoUrl?imageId=${id}`;
      
      const r1 = await httpGetText(url1, 5000);

      if (r1.status !== 200) {
        throw new Error(`GetVideoUrl failed status=${r1.status}`);
      }

      const token1 = r1.data;
      console.log("[ token1 ]",token1);
      
      // 2) SecureTokenUri (пробуємо 2 endpoints: загальний + host із originUrl)
      const originHost = originUrl ? new URL(originUrl).host : null;

      // const endpoints = [
      //   'https://pa.arcadis-ivds.com/api/SecureTokenUri/GetSecureTokenUriBySourceId',
      //   originHost ? `https://${originHost}/api/SecureTokenUri/GetSecureTokenUriBySourceId` : null,
      // ].filter(Boolean);

      let lastErr = null;
      const url2 ='https://divas.cloud/VDS-API/SecureTokenUri/GetSecureTokenUriBySourceId';

    //   for (const url2 of endpoints) {
        // const r2 = await httpPostText(url2, token1, 5000);
        const r2 = await httpPostText(url2, token1, 5000);


        if (r2.status === 200) {
          let secureTokenUri = String(r2.data || '').trim().replace(/^"+|"+$/g, '');
          if (!secureTokenUri) throw new Error('Empty secureTokenUri');

          // token TTL: 60s
          await cacheSetRaw(key, secureTokenUri, 60);
          console.log("[ secureTokenUri ]:", secureTokenUri);
          
          return secureTokenUri;
        }

        const body = String(r2.data || '');
        if (r2.status === 400 && /not enabled/i.test(body)) {
          // negative-cache: 5 хв
          await cacheSetRaw(key, DISABLED, 300);
          return '';
        }

        lastErr = new Error(`SecureTokenUri failed status=${r2.status} body=${body.slice(0, 160)}`);
    //   }

      throw lastErr || new Error('SecureTokenUri failed');
    },
  });
}

// ---------------- Auto fetch xflow ----------------
async function fetchPaXflowAuto({ id, originUrl }) {
  // warmup index (НЕ ламаємо запит на таймауті)
  console.log(`${originUrl}index.m3u8`);
  
  await httpGetText(`${originUrl}index.m3u8`, 2500).catch(() => {});

//   // 1) спроба без токена
//   let r = await httpGetText(`${originUrl}xflow.m3u8`, 7000);
// //   console.log("1) спроба без токена => r: ", r.data);
//   console.log("1) спроба без токена => r: ",r?.data.replace(0,10));

//   if (r.status === 200 && String(r.data || '').startsWith('#EXTM3U')) {
//     return { playlistText: r.data, secureTokenUri: '' };
//   }
  
  // 2) якщо не вийшло — беремо токен
  const secureTokenUri = await getFlSecureToken(id, originUrl);
  if (!secureTokenUri) {
    // токен "не увімкнений", але без токена не працює
    throw new Error(`FL xflow no-token failed (status=${r.status}) and token disabled`);
  }
  await httpGetText(`${originUrl}index.m3u8${secureTokenUri}`, 7000);
  r = await httpGetText(`${originUrl}xflow.m3u8${secureTokenUri}`, 7000);
  console.log("2) беремо токен => r: ", r.data);
  if (r.status === 200 && String(r.data || '').startsWith('#EXTM3U')) {
    return { playlistText: r.data, secureTokenUri };
  }

  throw new Error(`FL xflow failed even with token status=${r.status}`);
}
// async function fetchPaXflowAuto({ id, originUrl }) {
//   // 0) index пробуємо швидко
//   let rIndex = await httpGetText(`${originUrl}index.m3u8`, 2500).catch(() => null);

//   const indexOk =
//     rIndex &&
//     rIndex.status === 200 &&
//     typeof rIndex.data === 'string' &&
//     rIndex.data.startsWith('#EXTM3U');

//   // 1) якщо index НЕ ок — НЕ витрачаємо запит на xflow без токена
//   //    одразу пробуємо токен (або відразу помилка, якщо токен disabled)
//   if (!indexOk) {
//     const secureTokenUri = await getPaSecureToken(id, originUrl);

//     if (!secureTokenUri) {
//       // токен відключений, а index не m3u8 => скоріше за все апстрім блокує/дає html/timeout
//       throw new Error(
//         `PA: index not m3u8 (status=${rIndex ? rIndex.status : 'noresp'}) and token disabled`
//       );
//     }
//     await httpGetText(`${originUrl}index.m3u8${secureTokenUri}`, 7000);
//     const rTok = await httpGetText(`${originUrl}xflow.m3u8${secureTokenUri}`, 7000);
//     if (rTok.status === 200 && String(rTok.data || '').startsWith('#EXTM3U')) {
//       return { playlistText: rTok.data, secureTokenUri };
//     }

//     throw new Error(`PA: xflow failed with token status=${rTok.status}`);
//   }

//   // 2) index ок -> пробуємо xflow без токена
//   let r = await httpGetText(`${originUrl}xflow.m3u8`, 7000);
//   if (r.status === 200 && String(r.data || '').startsWith('#EXTM3U')) {
//     return { playlistText: r.data, secureTokenUri: '' };
//   }

//   // 3) якщо не вийшло — беремо токен
//   const secureTokenUri = await getPaSecureToken(id, originUrl);
//   if (!secureTokenUri) {
//     throw new Error(`PA: xflow no-token failed (status=${r.status}) and token disabled`);
//   }

//   r = await httpGetText(`${originUrl}xflow.m3u8${secureTokenUri}`, 7000);
//   if (r.status === 200 && String(r.data || '').startsWith('#EXTM3U')) {
//     return { playlistText: r.data, secureTokenUri };
//   }

//   throw new Error(`PA: xflow failed even with token status=${r.status}`);
// }

// ---------------- Rewrite playlist ----------------
function rewritePlaylist({ playlistText, id, originUrl, secureTokenUri }) {
  const lines = String(playlistText).split('\n');
  const base = new URL(originUrl);
  const st = (secureTokenUri || '').trim(); // "?token=..."

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      const u = new URL(trimmed, originUrl); // абсолютний

      // A) direct segments
    //   console.log("PA_DIRECT_SEGMENTS:", PA_DIRECT_SEGMENTS);
      
      if (PA_DIRECT_SEGMENTS) {
        if (st && !u.search.includes('token=')) {
          const qs = st.replace(/^\?/, '');
          const out = u.toString();
          return out + (out.includes('?') ? '&' : '?') + qs;
        }
        return u.toString();
      }

      // B) proxy segments через /seg/
      let relPath = u.pathname;
      if (relPath.startsWith(base.pathname)) relPath = relPath.slice(base.pathname.length);
      relPath = relPath.replace(/^\/+/, '');

      const prefix = `/cameras/api/v1/florida/${id}/`;
      let out = `${prefix}${encodeURIComponent(relPath)}?originUrl=${encodeURIComponent(originUrl)}`;

      // якщо сегмент уже має ?token=... — передаємо як sq
      if (u.search) out += `&sq=${encodeURIComponent(u.search)}`;
      // інакше — передаємо st
      else if (st) out += `&st=${encodeURIComponent(st)}`;

      return out;
    })
    .join('\n');
}

// ---------------- Handlers ----------------

// GET /cameras/api/v1/florida/:id?originUrl=...
async function getFlorida(req, res) {
  console.log(`=====================================> : ${req.params.id}`);

  try {
    const idParam = req.params.id;
    const originUrlParam = req.query.originUrl;

    if (!idParam) return res.status(400).json({ error: 'id is required' });
    if (!originUrlParam) return res.status(400).json({ error: 'originUrl is required' });

    const id = Number(idParam);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id must be a number' });

    const originUrl = normalizeOriginUrl(String(originUrlParam));

    const cacheKey = `pa:m3u8:${id}:${originUrl}`;
    const cached = await cacheGetRaw(cacheKey);
    if (cached) { 
        console.log('[ FL HIT m3u8 ] cache: ', cacheKey);
        
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(cached);
    }
    console.log('[ FL MISS M3U8 ] cache: ', cacheKey);

    const lockKey = `lock:${cacheKey}`;

    const rewritten = await withDistributedLock({
      lockKey,
      ttlMs: 6000,
      waitMs: 4000,
      fn: async () => {
        // після lock перевір кеш ще раз
        const cached2 = await cacheGetRaw(cacheKey);
        if (cached2) return cached2;

        const { playlistText, secureTokenUri } = await fetchPaXflowAuto({ id, originUrl });

        if (!String(playlistText || '').startsWith('#EXTM3U')) {
          throw new Error('Upstream is not M3U8');
        }

        const out = rewritePlaylist({ playlistText, id, originUrl, secureTokenUri });

        // TTL плейлиста: 10s
        await cacheSetRaw(cacheKey, out, 10);
        return out;
      },
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    return res.send(rewritten);
  } catch (err) {
    console.error('[getPenssylvania] FAILED:', err.message);

    if (err && err.code === 'ECONNABORTED') {
      return res.status(504).send('Upstream timeout (FL)');
    }
    return res.status(502).send(`Upstream error (FL): ${err.message}`);
  }
}

// GET /cameras/api/v1/florida/:id/seg/:fileName(*)?originUrl=...&sq=...|st=...
async function proxyFloridaHlsFile(req, res) {
  const id = Number(req.params.id);
  const originUrlParam = req.query.originUrl;
  const fileNameRaw = req.params.fileName;

  const sq = (req.query.sq || '').toString(); // "?token=..."
  const st = (req.query.st || '').toString(); // "?token=..."

  if (!Number.isFinite(id)) return res.status(400).send('id must be a number');
  if (!originUrlParam || !fileNameRaw) return res.status(400).send('Bad params');

  const originUrl = normalizeOriginUrl(String(originUrlParam));

  let fileName = fileNameRaw;
  try {
    fileName = decodeURIComponent(fileNameRaw);
  } catch {}

  let upstreamUrl = new URL(fileName, originUrl).toString();

  // додаємо токен тільки якщо його немає в URL
  const qs = (sq || st).replace(/^\?/, '');
  if (qs && !upstreamUrl.includes('token=')) {
    upstreamUrl += (upstreamUrl.includes('?') ? '&' : '?') + qs;
  }

  try {
    const headers = paHeaders();
    if (req.headers.range) headers.range = req.headers.range;

    const upstreamRes = await segLimit(() =>
      axios.get(upstreamUrl, {
        httpsAgent: paHttpsAgent,
        responseType: 'stream',
        headers,
        timeout: 8000,
        validateStatus: () => true,
      }),
    );

    if (upstreamRes.status === 404) return res.sendStatus(404);
    if (upstreamRes.status < 200 || upstreamRes.status >= 300) return res.sendStatus(502);

    if (/\.(ts)(\?|$)/i.test(fileName)) {
      res.setHeader('Content-Type', 'video/MP2T');
    }

    res.status(upstreamRes.status);
    return upstreamRes.data.pipe(res);
  } catch (err) {
    if (err && err.code === 'ECONNABORTED') return res.sendStatus(504);
    return res.sendStatus(502);
  }
}

module.exports = {
  getFlorida,
  proxyFloridaHlsFile,
};
// http://127.0.0.1:3000/