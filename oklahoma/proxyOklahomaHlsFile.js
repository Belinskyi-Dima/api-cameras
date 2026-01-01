const {loadStateCameras} = require("../../cache/roadCamerasCache");
const { Readable } = require('node:stream');
const requestOptions = {
  method: 'GET',
   headers: {
    // максимально наближено до браузера
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'content-type': 'application/json',
    'referer': 'https://oktraffic.org/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',

    // !!! СЮДИ ВСТАВ СВІЙ COOKIE З DEVTOOLS (НЕ КОМІТИТИ В GIT)
    // 'cookie': '_ga=GA1.1.1481789465.1758285638; G_ENABLED_IDPS=google; cf_clearance=LV7fmQlJq_da6UpbMHq4VKtmthGsba3LKQu7cv8Y46o-1764234222-1.2.1.1-7l.aYTknby2VaUUZnf3e0Qse7qWpWR8E6HEizKLNm1HjCp6Rc3SlugX8iU_wHfBLaZD0p8xD3Un93iCMV0HXq5TV5TcoYKlcfRjZcT1vNWA6wCCcghPIEsE2s823rRDrznUm_94fX3c2jiX_SXhlbhAQ5aH7RPIDBNKtWRDz.EzqHBOv5ZlsDYsDTH0.LNtDLhcdAS1TSmdvGeh5opfy1IZ8A79oVqrlyKfGe7xLNUk; _ga_50HP3PMN79=GS2.1.s1764230904$o2$g1$t1764234274$j60$l0$h0',

  
    // 'filter': JSON.stringify(filter)
  }
};
async function proxyOklahomaHlsFile(req, res) {
  const id = Number(req.params.id);
  const fileName = req.params.fileName;
  console.log('proxyHls id:', id, 'file:', fileName);

  try {
    const {streamSrc} = await getStreamSrcById(id);
    if (!streamSrc) {
      return res.status(404).send('camera not found');
    }

    // streamSrc: .../playlist.m3u8 → базовий URL
    const base = streamSrc.replace(/playlist\.m3u8$/, '');
    const upstreamUrl = base + fileName;

    const upstreamRes = await fetch(upstreamUrl, requestOptions);
    if (!upstreamRes.ok) {
      console.error('[OK HLS] upstream error:', upstreamRes.status, upstreamUrl);
      return res.sendStatus(upstreamRes.status);
    }

    if (fileName.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      const text = await upstreamRes.text();
      // chunklist зазвичай містить .ts з відносними шляхами – базою для них уже буде
      // /cameras/api/v1/oklahoma/:id/, цей же роут зловить /:id/:tsName
      res.send(text);
    } else if (fileName.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/MP2T');
      // upstreamRes.body.pipe(res);
      Readable.fromWeb(upstreamRes.body).pipe(res);
    } else {
      // upstreamRes.body.pipe(res);
      Readable.fromWeb(upstreamRes.body).pipe(res);
    }
  } catch (e) {
    console.error('[OK HLS] file proxy error:', e);
    res.sendStatus(500);
  }
}
async function getStreamSrcById(id) {
  const data = await loadStateCameras('oklahoma');
  if (!data) return null;

  const pole = data.items.find(item => item.id === id);
  if (!pole) return null;

  // Наприклад, беремо напрямок N як дефолт
  // const cam = pole.mapCameras.find(c => c.type === 'Web' && c.streamDictionary?.streamSrc);
  // return cam?.streamDictionary?.streamSrc || null;
  return pole
}
module.exports = {proxyOklahomaHlsFile}