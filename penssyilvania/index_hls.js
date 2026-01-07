// src/controllers/penssyilvania/index.js
const https = require('https');
const axios = require('axios');

const paHttpsAgent = new https.Agent({
  rejectUnauthorized: false, // вимикаємо TLS-перевірку тільки для цих запитів
});

const commonHeaders = {
  accept: '*/*',
  'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

async function getPenssylvania(req, res) {
  try {
    const idParam = req.params.id;
    const originUrl = req.query.originUrl;

    if (!idParam) {
      return res.status(400).json({ error: 'id is required' });
    }
    if (!originUrl) {
      return res.status(400).json({ error: 'originUrl is required' });
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'id must be a number' });
    }

    // 1) 511PA: token/sourceId/systemSourceId
    const url1 = `https://www.511pa.com/Camera/GetVideoUrl?imageId=${id}`;

    const upstreamRes = await axios.get(url1, {
      httpsAgent: paHttpsAgent,
      headers: {
        ...commonHeaders,
        origin: 'https://www.511pa.com',
        referer: 'https://www.511pa.com/',
        'accept-encoding': 'gzip, deflate, br, zstd',
      },
      // ВАЖЛИВО: responseType НЕ ВКАЗУЄМО → axios сам розпарсить JSON
      timeout: 5000,
    });

    console.log('[PA] GetVideoUrl status:', upstreamRes.status);

    if (upstreamRes.status !== 200) {
      return res
        .status(502)
        .send('Failed to get video meta from 511pa.com');
    }

    const token1 = upstreamRes.data;  // тепер це ОБ’ЄКТ, не string
    console.log('[master 1] :', token1);

    // 2) POST на pa.arcadis-ivds.com за secureTokenUri
    const url2 =
      'https://pa.arcadis-ivds.com/api/SecureTokenUri/GetSecureTokenUriBySourceId';

    const token2 = await axios.post(url2, token1, {
      httpsAgent: paHttpsAgent,
      headers: {
        ...commonHeaders,
        origin: 'https://www.511pa.com',
        referer: 'https://www.511pa.com/',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'content-type': 'application/json',
      },
      responseType: 'text', // тут ок, очікуємо строку типу "?token=...."
      timeout: 5000,
    });

    console.log('[PA] arcadis status:', token2.status);

    if (token2.status !== 200) {
      console.error('[PA] arcadis body:', token2.data);
      return res.status(502).send('Failed to get secure token');
    }

    const body = token2.data;   // string типу "?token=...."
    let secureTokenUri;

    if (typeof body === 'string') {
    // спробуємо розпарсити JSON-рядок, щоб прибрати зовнішні лапки
    try {
        const parsed = JSON.parse(body); // якщо body === "\"?token=...\"" → parsed === "?token=..."
        secureTokenUri = parsed;
    } catch (_) {
        secureTokenUri = body;
    }
    } else if (body && typeof body.secureTokenUri === 'string') {
    secureTokenUri = body.secureTokenUri;
    } else {
    throw new Error('Unexpected token2 body format');
    }
    secureTokenUri = secureTokenUri.trim();

    // на всякий випадок – прибрати лапки, якщо ще лишились
    secureTokenUri = secureTokenUri.replace(/^"+|"+$/g, '');
        console.log('[ master ] secureTokenUri:', secureTokenUri);

    // 3) m3u8 (index + xflow)
    const m3u8Url1Index = `${originUrl}index.m3u8${secureTokenUri}`;
    const m3u8UrlXflow = `${originUrl}xflow.m3u8${secureTokenUri}`;
    console.log('m3u8Url:', m3u8UrlXflow);

    await axios.get(m3u8Url1Index, {
      httpsAgent: paHttpsAgent,
      headers: {
        ...commonHeaders,
        origin: 'https://www.511pa.com',
        referer: 'https://www.511pa.com/',
        'accept-encoding': 'gzip, deflate, br, zstd',
      },
      responseType: 'text',
      timeout: 5000,
    }).catch((e) => {
      console.warn('[PA] index.m3u8 warmup failed:', e.message);
    });

    const respM3U8 = await axios.get(m3u8UrlXflow, {
      httpsAgent: paHttpsAgent,
      headers: {
        ...commonHeaders,
        origin: 'https://www.511pa.com',
        referer: 'https://www.511pa.com/',
        'accept-encoding': 'gzip, deflate, br, zstd',
      },
      responseType: 'text',
      timeout: 5000,
    });

    console.log('[PA] m3u8 status:', respM3U8.status);

    if (respM3U8.status !== 200) {
      console.error('[PA] m3u8 body:', respM3U8.data);
      return res.status(502).send('Failed to load PA m3u8 playlist');
    }

    const playlistText = respM3U8.data;
    if (!playlistText.startsWith('#EXTM3U')) {
      console.warn(
        '[PA master] Not M3U8, first line:',
        playlistText.split('\n')[0],
      );
      return res.status(502).send('Upstream is not M3U8');
    }

    const lines = playlistText.split('\n');

    const prefix = `/cameras/api/v1/penssylvania/${id}/`;

    const rewritten = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        return (
          prefix +
          trimmed +
          '&originUrl=' +
          encodeURIComponent(originUrl)
        );
      })
      .join('\n');

    res.setHeader(
      'Content-Type',
      'application/vnd.apple.mpegurl',
    );
    // console.log("rewritten==> ",rewritten);
     console.log("---------------------------");
    res.send(rewritten);
  } catch (err) {
    console.error('[getPenssylvania] FAILED:', err.message);
    if (err.response) {
      console.error(
        '[getPenssylvania] upstream status:',
        err.response.status,
      );
      console.error(
        '[getPenssylvania] upstream data:',
        err.response.data,
      );
    }
    if (err.cause) {
      console.error('[getPenssylvania] CAUSE:', err.cause);
    }
    res.status(500).send('Internal error (Pennsylvania)');
  }
}

module.exports = { getPenssylvania };
