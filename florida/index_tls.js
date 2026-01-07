// src/controllers/florida/index.js
const https = require('https');
const axios = require('axios');

// Агент тільки для Florida-запитів, з вимкненою перевіркою TLS
const floridaHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const commonHeaders = {
  accept: '*/*',
  'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

async function getFlorida(req, res) {
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

    // 1) FL511: отримуємо token/sourceId/systemSourceId
    const url1 = `https://www.fl511.com/Camera/GetVideoUrl?imageId=${id}`;

    const upstreamRes = await axios.get(url1, {
      httpsAgent: floridaHttpsAgent,
      headers: {
        ...commonHeaders,
        referer:
          'https://www.fl511.com/cctv?start=0&length=10&order%5Bi%5D=1&order%5Bdir%5D=asc',
      },
      timeout: 5000,
    });

    console.log('[FL] GetVideoUrl status:', upstreamRes.status);

    if (upstreamRes.status !== 200) {
      return res
        .status(502)
        .send('Failed to get video meta from fl511.com');
    }

    const token1 = upstreamRes.data; // axios -> data, не json()

    // 2) POST на divas.cloud за secureTokenUri
    const url2 =
      'https://divas.cloud/VDS-API/SecureTokenUri/GetSecureTokenUriBySourceId';

    const token2 = await axios.post(url2, token1, {
      httpsAgent: floridaHttpsAgent,
      headers: {
        ...commonHeaders,
        origin: 'https://www.fl511.com',
        referer: 'https://www.fl511.com/',
        'content-type': 'application/json',
      },
      timeout: 5000,
    });

    console.log('[FL] divas.cloud status:', token2.status);

    if (token2.status !== 200) {
      console.error('divas.cloud body:', token2.data);
      return res.status(502).send('Failed to get secure token');
    }

    const body = token2.data;
    const secureTokenUri = (typeof body === 'string'
      ? body
      : body.secureTokenUri
    ).trim();

    // 3) m3u8 (xflow.m3u8 + token)
    const requestOptionsM3U8 = {
      httpsAgent: floridaHttpsAgent,
      headers: {
        ...commonHeaders,
        'accept-encoding': 'gzip, deflate, br, zstd',
        origin: 'https://www.fl511.com',
        referer: 'https://www.fl511.com/',
      },
      responseType: 'text',
      timeout: 5000,
    }
    const m3u8UrlIndex = `${originUrl}index.m3u8${secureTokenUri}`;
    const m3u8UrlXflow = `${originUrl}xflow.m3u8${secureTokenUri}`;
    
    await axios.get(m3u8UrlIndex, requestOptionsM3U8);
    console.log('m3u8Url:', m3u8UrlXflow);
    const respM3U8 = await axios.get(m3u8UrlXflow, requestOptionsM3U8);

    console.log('[FL] m3u8 status:', respM3U8.status);

    if (respM3U8.status !== 200) {
      console.error('m3u8 body:', respM3U8.data);
      return res.status(502).send('Failed to load m3u8 playlist');
    }

    const playlistText = respM3U8.data;

    if (!playlistText.startsWith('#EXTM3U')) {
      console.warn(
        '[FL master] Not M3U8, first line:',
        playlistText.split('\n')[0],
      );
      return res.status(502).send('Upstream is not M3U8');
    }

    const lines = playlistText.split('\n');
    const prefix = `/cameras/api/v1/florida/${id}/`;

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
    res.send(rewritten);
  } catch (err) {
    console.error('[getFlorida] FETCH FAILED:', err.message);
    if (err.response) {
      console.error(
        '[getFlorida] upstream status:',
        err.response.status,
      );
      console.error('[getFlorida] upstream data:', err.response.data);
    }
    if (err.cause) {
      console.error('[getFlorida] CAUSE:', err.cause);
    }
    res.status(500).send('Internal error (Florida)');
  }
}

module.exports = { getFlorida };
