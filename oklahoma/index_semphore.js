const {loadStateCameras} = require("../cache/roadCamerasCache");
const {refreshOklahomaCamerasToRedis} = require("../worker/refreshOklahomaCamerasToRedis")
const cache = require('../cache/backend');
const requestOptions = {
  method: 'GET',
  headers: {
    'accept': 'application/vnd.apple.mpegurl,*/*;q=0.9',
    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    // для GET content-type не потрібен
    'referer': 'https://oktraffic.org/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    // 'cookie': '...'
  },
};

async function getStreamSrcById(id) {
  let data = await loadStateCameras('oklahoma');
  if (!data || !Array.isArray(data.items)) {
    console.log('[OK] cache miss or bad format, refreshing cameras…');
    await refreshOklahomaCamerasToRedis();      // ⚠️ лишаєш так, як у тебе вже є
    data = await loadStateCameras('oklahoma');
  }

  if (!data || !Array.isArray(data.items)) {
    console.error('[OK] no data after refreshOklahomaCamerasToRedis');
    return null;
  }

  // id може бути числом/стрінгою → приводимо до string
  const pole = data.items.find(item => String(item.id) === String(id));
  return pole || null;
}

// ЦЕ ТЕПЕР MASTER PLAYLIST ДЛЯ ПЛЕЄРА (з прямими origin-URL)
async function getOklahomaCameras(req, res) {
  const idParam = req.params.id;
  console.log('[OK master] id:', idParam);

  if (!idParam) {
    return res.status(400).json({ error: 'id is required' });
  }

  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  try {
    const cacheKey = `ok:m3u8:${id}`;
    const cached = await cache.getJson(cacheKey);
    if (cached) {
      console.log('[OK HIT m3u8Cache]', cacheKey);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(cached);
    }

    const camera = await getStreamSrcById(id);
    console.log('[ 1 OK master] camera:', camera);

    if (!camera || !camera.streamSrc) {
      return res.status(404).send('camera not found');
    }

    const masterUrl = camera.streamSrc; // типово щось на кшталт .../playlist.m3u8
    const upstreamRes = await fetch(masterUrl, requestOptions);
    const body = await upstreamRes.text();

    console.log('[OK master] status:', upstreamRes.status);
    console.log(
      ' 2 [OK master] body snippet:',
      body.slice(0, 160).replace(/\n/g, '\\n'),
    );

    if (!upstreamRes.ok) {
      return res.sendStatus(upstreamRes.status);
    }

    if (!body.startsWith('#EXTM3U')) {
      console.warn(
        '[OK master] Not an M3U8 playlist, first line:',
        body.split('\n')[0],
      );
      return res.status(502).send('Upstream is not M3U8');
    }

    // базовий URL для відносних шляхів із плейліста
    // було: .../playlist.m3u8 → стане: .../
    const originBase = masterUrl.replace(/playlist\.m3u8.*$/i, '');

    const rewritten = body
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        // Якщо рядок уже повний URL (https://...) – лишаємо як є
        if (/^https?:\/\//i.test(trimmed)) {
          return trimmed;
        }

        // Інакше це відносний шлях типу "chunklist_w1234.m3u8" або "seg123.ts?token=..."
        const [pathPart, queryPart] = trimmed.split('?', 2);
        const query = queryPart ? '?' + queryPart : '';

        // Склеюємо з originBase: тепер плеєр піде напряму на CDN/джерело
        return originBase + pathPart + query;
      })
      .join('\n');
      // кладемо в кеш НА КІЛЬКА СЕКУНД
    const TTL_SEC = 5;
    await cache.setJson(cacheKey, rewritten, TTL_SEC);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } catch (err) {
    console.error('[OK] getOklahomaCameras error:', err);
    res.status(500).send('Internal error');
  }
}
module.exports = { getOklahomaCameras };