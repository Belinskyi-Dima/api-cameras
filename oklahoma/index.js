const path = require("path");
const fs = require('fs/promises');

// const {fetchData} = require("./fetchData");
const folderPath = path.join(__dirname, "result_camera");
const filePath = path.join(folderPath, "oklahoma_cameras.json");
const {loadStateCameras} = require("../../cache/roadCamerasCache")
// const {getTtlToNextRotationSec} = require("./getTtlToNextRotationSec")
const {refreshOklahomaCamerasToRedis} = require("../../worker/refreshOklahomaCamerasToRedis")
/**
 * @typedef {Object} StreamDictionary
 * @property {string} streamKey
 * @property {string} streamName
 * @property {string} streamSrc
 * @property {string} streamingServer
 * @property {number} id
 * @property {number} mapCameraId
 */

/**
 * @typedef {Object} MapCamera
 * @property {number} id
 * @property {string} latitude
 * @property {string} longitude
 * @property {string} location
 * @property {string} direction
 * @property {StreamDictionary} streamDictionary
 */

/**
 * @typedef {Object} CameraPole
 * @property {number} id
 * @property {string} name
 * @property {string} dateInserted
 * @property {string} dateUpdated
 * @property {MapCamera[]} mapCameras
 */

/**
 * @typedef {Object} StateCamerasPayload
 * @property {string} updatedAt
 * @property {CameraPole[]} items
 */
/**
 * @param {import('express').Request<{ id: string }>} req
 * @param {import('express').Response} res
 */


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
    await refreshOklahomaCamerasToRedis();
    data = await loadStateCameras('oklahoma');
  }

  if (!data || !Array.isArray(data.items)) {
    console.error('[OK] no data after refreshOklahomaCamerasToRedis');
    return null;
  }
  // const pole = data.items.find(item => item.id === id);
   const pole = data.items.find(item => String(item.id) === String(id));
  if (!pole) return null;

  // const cam = pole.mapCameras.find(
  //   c => c.type === 'Web' && c.streamDictionary?.streamSrc
  // );
  // return cam?.streamDictionary?.streamSrc || null;
  return pole || null;
}

// ЦЕ ТЕПЕР MASTER PLAYLIST ДЛЯ ПЛЄРА
async function getOklahomaCameras(req, res) {
  const idParam = req.params.id;
  console.log('master id:', idParam);

  if (!idParam) {
    return res.status(400).json({ error: 'id is required' });
  }
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  try {
    const streamSrc = await getStreamSrcById(id);
    console.log("streamSrc: ", streamSrc);
    
    if (!streamSrc) {
      return res.status(404).send('camera not found');
    }

    const upstreamRes = await fetch(streamSrc.streamSrc, requestOptions);
    const body = await upstreamRes.text();

    console.log('status:', upstreamRes.status);
    console.log('body snippet:', body.slice(0, 120).replace(/\n/g, '\\n'));

    if (!upstreamRes.ok) {
      return res.sendStatus(upstreamRes.status);
    }

    if (!body.startsWith('#EXTM3U')) {
      console.warn('Not an M3U8 playlist, first line:', body.split('\n')[0]);
      return res.status(502).send('Upstream is not M3U8');
    }
  // res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  //   res.send(body);
    // Переписуємо лінії типу "chunklist_w....m3u8" → /cameras/api/v1/oklahoma/:id/...
    const lines = body.split('\n');
    // const prefix = `/cameras/api/v1/oklahoma/${id}/`;
    const prefix = `/cameras/api/v1/oklahoma/${id}/`;


    const rewritten = lines
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        // тут, як правило, буде один рядок chunklist_...
        return prefix + trimmed;
      })
      .join('\n');
      console.log("rewritten: ",rewritten);
      
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } catch (err) {
    console.error('[OK] getOklahomaCameras error:', err);
    res.status(500).send('Internal error');
  }
}
module.exports = {getOklahomaCameras, getStreamSrcById }
// oklahoma()
// https://www.arcgis.com/apps/Viewer/index.html?appid=023e821ebf7b4acd999ccfd58d92c3da

// async function fetchSrteam(id) {
//     const url = 'https://oktraffic.org/streams/delay-stream/1635236305099b5a.stream/playlist.m3u8'
    
// const requestOptions = {
//   method: 'GET',
//    headers: {
//     // максимально наближено до браузера
//     'accept': 'application/json, text/plain, */*',
//     'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
//     'cache-control': 'no-cache',
//     'pragma': 'no-cache',
//     'content-type': 'application/json',
//     'referer': 'https://oktraffic.org/',
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',

//     // !!! СЮДИ ВСТАВ СВІЙ COOKIE З DEVTOOLS (НЕ КОМІТИТИ В GIT)
//     // 'cookie': '_ga=GA1.1.1481789465.1758285638; G_ENABLED_IDPS=google; cf_clearance=LV7fmQlJq_da6UpbMHq4VKtmthGsba3LKQu7cv8Y46o-1764234222-1.2.1.1-7l.aYTknby2VaUUZnf3e0Qse7qWpWR8E6HEizKLNm1HjCp6Rc3SlugX8iU_wHfBLaZD0p8xD3Un93iCMV0HXq5TV5TcoYKlcfRjZcT1vNWA6wCCcghPIEsE2s823rRDrznUm_94fX3c2jiX_SXhlbhAQ5aH7RPIDBNKtWRDz.EzqHBOv5ZlsDYsDTH0.LNtDLhcdAS1TSmdvGeh5opfy1IZ8A79oVqrlyKfGe7xLNUk; _ga_50HP3PMN79=GS2.1.s1764230904$o2$g1$t1764234274$j60$l0$h0',

  
//     // 'filter': JSON.stringify(filter)
//   }
// };


// const res = await fetch(url, requestOptions);
//     // читаємо ТІЛЬКИ ОДИН раз
//   const bodyText = await res.text();
//   if (!res.ok) {
//     console.error('Bad status:', res.status);
//     console.error('Body snippet:', bodyText.slice(0, 500));
//     throw new Error(`HTTP error Oklahoma! Status: ${res.status}`);
    
//     // throw new Error(`HTTP error Oklahoma! Status: ${res.status}, body: ${text}`);
//   }

//   return bodyText;
    
// }
// function extractChunklistName(m3uText) {
//   // розбиваємо по рядках, чистимо пробіли
//   const lines = m3uText
//     .split('\n')
//     .map(l => l.trim())
//     .filter(Boolean); // прибираємо пусті

//   // шукаємо перший рядок, який не починається з # і закінчується на .m3u8
//   const chunkLine = lines.find(line => !line.startsWith('#') && line.endsWith('.m3u8'));

//   return chunkLine || null;
// }
// async function getOklahomaCameras(req, res) {
//   const idParam = req.params.id;
//   console.log("id:", idParam);
//   if (!idParam) {
//     return res.status(400).json({ error: 'id is required' });
//   }
//    const id = Number(idParam);
//   if (!Number.isFinite(id)) {
//     return res.status(400).json({ error: 'id must be a number' });
//   }
//     // const url = 'https://oktraffic.org/streams/delay-stream/1635236305099b5a.stream/playlist.m3u8'
//     // const resultFetchData = await getChunklistUrl(url);

//     // console.log('chunklistName:', resultFetchData);
//   try {
//     /** @type {StateCamerasPayload | null} */
//     const data = await loadStateCameras('oklahoma');

//     if (!data) {
//       // console.log("no cameras yet");
      
//       return res.status(503).json({ error: 'No camera data yet' });
//     }
//      /** @type {CameraPole | undefined} */
//     const cameraPole = data.items.find(item => item.id === id);
//     if (!cameraPole) {
//       return res.status(404).json({ error: 'Camera pole not found' });
//     }
    
//     const resultFetchData = await getChunklistUrl(cameraPole.streamSrc);
//     console.log(resultFetchData);
    
//     res.json(resultFetchData);
//   } catch (err) {
//     console.error('[OK] getOklahomaCameras error:', err);
//     res.status(500).json({ error: 'Internal error' });
//   }

// }
// async function getChunklistUrl(masterUrl) {
// //   const res = await fetch(masterUrl);
// const requestOptions = {
//   method: 'GET',
//    headers: {
//     // максимально наближено до браузера
//     'accept': 'application/json, text/plain, */*',
//     'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
//     'cache-control': 'no-cache',
//     'pragma': 'no-cache',
//     // 'content-type': 'application/json',
//     'referer': 'https://oktraffic.org/',
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',

//     // !!! СЮДИ ВСТАВ СВІЙ COOKIE З DEVTOOLS (НЕ КОМІТИТИ В GIT)
//     // 'cookie': '_ga=GA1.1.1481789465.1758285638; G_ENABLED_IDPS=google; cf_clearance=LV7fmQlJq_da6UpbMHq4VKtmthGsba3LKQu7cv8Y46o-1764234222-1.2.1.1-7l.aYTknby2VaUUZnf3e0Qse7qWpWR8E6HEizKLNm1HjCp6Rc3SlugX8iU_wHfBLaZD0p8xD3Un93iCMV0HXq5TV5TcoYKlcfRjZcT1vNWA6wCCcghPIEsE2s823rRDrznUm_94fX3c2jiX_SXhlbhAQ5aH7RPIDBNKtWRDz.EzqHBOv5ZlsDYsDTH0.LNtDLhcdAS1TSmdvGeh5opfy1IZ8A79oVqrlyKfGe7xLNUk; _ga_50HP3PMN79=GS2.1.s1764230904$o2$g1$t1764234274$j60$l0$h0',

  

//   }
// };
// console.log("masterUrl: ",masterUrl);


// const res = await fetch(masterUrl, requestOptions);
//   const body = await res.text();
//   console.log('status:', res.status);
//   console.log('body snippet:', body.slice(0, 200).replace(/\n/g, '\\n'));
//     // перевірка, що це взагалі M3U8
//   if (!body.startsWith('#EXTM3U')) {
//     console.warn('Not an M3U8 playlist, first line:', body.split('\n')[0]);
//     return null;
//   }
//   return body
//   const match = body.match(/^[^#\r\n]+\.m3u8$/m);
//   if (!match) {
//     console.warn('Chunklist .m3u8 not found in master playlist');
//     return null;
//     // throw new Error('Chunklist .m3u8 not found in master playlist');
//   }

//   const chunklistName = match[0].trim();
//   const chunklistUrl = new URL(chunklistName, masterUrl).toString();

//   return { chunklistName, chunklistUrl };
// }