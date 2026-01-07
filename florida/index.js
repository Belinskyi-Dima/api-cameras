// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { loadStateCameras } = require('../cache/roadCamerasCache'); // або звідки ти це імпортуєш
const requestOptions = {
  method: 'GET',
  headers: {
    'accept': '*/*',
    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    // 'content-type' для GET не потрібен
    'referer': 'https://www.fl511.com/cctv?start=0&length=10&order%5Bi%5D=1&order%5Bdir%5D=asc', // або правильний домен Alabama, можна й без нього
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  },
};

async function getFlorida(req,res) {
  // const originUrl = 'https://dis-se15.divas.cloud:8200/chan-1185_h/';
    try {
    const idParam = req.params.id;
    const originUrl = req.query.originUrl
    // console.log('[FL master] id:', idParam);

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
    // const time = new Date()
    const time = new Date().getTime()
    const url1 = `https://www.fl511.com/Camera/GetVideoUrl?imageId=${id}`;

    const upstreamRes = await fetch(url1, requestOptions);
    const token1 = await upstreamRes.json();
    // console.log('[master] :', token1);
    // requestOptionsPost.payload = token1;
    const requestOptionsPost = {
        method: 'POST',
        headers: {
            'accept': '*/*',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
            'cache-control': 'no-cache',
            'pragma': 'no-cache',
            'origin': 'https://www.fl511.com',
            'referer': 'https://www.fl511.com/',
            'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'content-type': 'application/json'
            // __requestverificationtoken можна додати, якщо треба:
            // '__requestverificationtoken': verificationTokenFromFl511
        },
        body: JSON.stringify(token1)
        };
    const url2 = `https://divas.cloud/VDS-API/SecureTokenUri/GetSecureTokenUriBySourceId`;
    const token2 = await fetch(url2, requestOptionsPost);
    // if(token2.status!== 200) res.status(400).json({ error: 'refuse status 200',token2 })
    if (!token2.ok) {
        console.error('divas.cloud status:', token2.status);
        console.error('body:', await token2.text());
        throw new Error('Failed to get secure token');
    }
    // const rawBody = await token2.text();
    // const token3 = rawBody.replace('"',"")
    // console.log('rawBody:', token3);

    //  console.log("master tiken2: ",token2);
    //  const url3 = `https://dis-se15.divas.cloud:8200/chan-1185_h/index.m3u8`;
    //  const url4 = `${url3}${token3}`;    xflow
    //  console.log("url4: ",url4);
     
    const body = await token2.json();   // скоріш за все string типу "?token=...."
    const secureTokenUri = (typeof body === 'string' ? body : body.secureTokenUri).trim();

    // console.log('[ master ] secureTokenUri:', secureTokenUri);

    // фінальний m3u8:
    const m3u8Url1 = `${originUrl}index.m3u8${secureTokenUri}`;

    const m3u8Url = `${originUrl}xflow.m3u8${secureTokenUri}`;
    console.log('m3u8Url:', m3u8Url);
    const requestOptionsM3U8 = {
    method: 'GET',
    headers: {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
        'cache-control': 'no-cache',
        'origin': 'https://www.fl511.com',
        'pragma': 'no-cache',
        'referer': 'https://www.fl511.com/',
        'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }
    };
    await fetch(m3u8Url1, requestOptionsM3U8);
    const respM3U8  = await fetch(m3u8Url, requestOptionsM3U8);
    
    if (!respM3U8.ok) {
    console.error('m3u8 status:', respM3U8.status);
    console.error('m3u8 body:', await respM3U8.text());
    throw new Error('Failed to load m3u8 playlist');
    }
    const playlistText = await respM3U8.text();

     if (!playlistText.startsWith('#EXTM3U')) {
      console.warn('[AL master] Not M3U8, first line:', playlistText.split('\n')[0]);
      return res.status(502).send('Upstream is not M3U8');
    }
    // console.log('playlist:\n', playlistText);
   
    
    const lines = playlistText.split('\n');
    const prefix = `/cameras/api/v1/florida/${id}/`;

    const rewritten = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        // було:  "chunklist.m3u8"
        // стане: "/cameras/api/v1/alabama/2059/chunklist.m3u8"
        return prefix + trimmed+"&originUrl="+ originUrl;
      })
      .join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    console.log("rewritten==> ",rewritten);
     console.log("---------------------------");
    res.send(rewritten);

     } catch (err) {
    console.error('[getFlorida] FETCH FAILED:', err);
    if (err.cause) {
      console.error('[getFlorida] CAUSE:', err.cause);
    }
    throw err;
  }
}
module.exports = {getFlorida};