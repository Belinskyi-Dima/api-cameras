const { Readable } = require('node:stream');
const https = require('https');
const axios = require('axios');

const floridaHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// const requestOptions = {
//   method: 'GET',
//   headers: {
//     'accept': '*/*',
//     'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
//     'cache-control': 'no-cache',
//     'pragma': 'no-cache',
      // 'origin': 'https://www.511pa.com',
        // 'referer': 'https://www.511pa.com/',
//     'user-agent':
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
//   },
// };
// async function proxyPenssylvaniaHlsFile(req, res) {
//     const id = Number(req.params.id);
//     const fileName = req.params.fileName;
//     const originUrl = req.query.originUrl

//     console.log('[ file ] id:', id, 'file:', fileName, "originUrl: ", originUrl);

//     if (!Number.isFinite(id)) {
//         return res.status(400).send('id must be a number');
//     }
//     let upstreamUrl = originUrl + fileName; 
//     console.log('[AR file] upstreamUrl:', upstreamUrl);

//     const upstreamRes = await fetch(upstreamUrl, requestOptions);
//     if (!upstreamRes.ok) {
//       console.error('[AR file] upstream error:', upstreamRes.status);
//       return res.sendStatus(upstreamRes.status);
//     }
    
//    if (fileName.endsWith('.ts')) {
//       res.setHeader('Content-Type', 'video/MP2T');

//       if (!upstreamRes.body) {
//         console.error('[AR file] no body');
//         return res.sendStatus(502);
//       }

//       const nodeStream = Readable.fromWeb(upstreamRes.body);
//       nodeStream.pipe(res);
//     } else {
//       const buf = Buffer.from(await upstreamRes.arrayBuffer());
//       res.end(buf);
//     }

// }
async function proxyPenssylvaniaHlsFile(req, res) {
    const id = Number(req.params.id);
    const fileName = req.params.fileName;
    const originUrl = req.query.originUrl

    if (!Number.isFinite(id)) {
    return res.status(400).send('id must be a number');
  }
  if (!fileName || !originUrl) {
    return res.status(400).send('Bad params');
  }
  
    console.log('[ file ] id:', id, 'file:', fileName, "originUrl: ", originUrl);
try{
    let upstreamUrl = originUrl + fileName; 
    console.log('[PA file] upstreamUrl:', upstreamUrl);

    const upstreamRes = await axios.get(upstreamUrl, {
      httpsAgent: floridaHttpsAgent,
      responseType: 'stream',
      headers: {
        accept: '*/*',
        'accept-language':
          'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        origin: 'https://www.511pa.com',
        referer: 'https://www.511pa.com/',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });
    
    if (upstreamRes.status < 200 || upstreamRes.status >= 300) {
      console.error(
        '[PA file] upstream bad status:',
        upstreamRes.status,
      );
      return res
        .status(502)
        .send('Failed to fetch TS segment from upstream');
    }

    // Це TS-сегмент – виставляємо правильний content-type
    if (fileName.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/MP2T');
    }

    // Проксі стрім
    upstreamRes.data.on('error', (err) => {
      console.error('[PA file] stream error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end();
    });

    upstreamRes.data.pipe(res);
  } catch (err) {
    // axios помилка
    if (err.response) {
      const status = err.response.status;
      console.error('[PA file] upstream error status:', status);

      if (status === 404) {
        // сегмент, скоріше за все, вже випав із HLS-вікна — це нормально для live
        console.warn('[PA file] segment 404 (probably expired):', fileName);
        return res.sendStatus(404);
      }

      // інші коди (401, 500, 503, ...) — як помилка апстріма
      return res.sendStatus(502);
    }

    if (err.cause) {
      console.error('[PA file] CAUSE:', err.cause);
    }
    console.error('[PA file] unexpected error:', err.message);
    return res.sendStatus(502);
 
    // console.error('[proxyFloridaHlsFile] error:', err.message);

    // if (err.response) {
    //   console.error(
    //     '[proxyFloridaHlsFile] upstream status:',
    //     err.response.status,
    //   );
    // }
    // if (err.cause) {
    //   console.error(
    //     '[proxyFloridaHlsFile] CAUSE:',
    //     err.cause,
    //   );
    // }

    // res.status(500).send('Internal error (Florida TS)');
  }

}
module.exports = {proxyPenssylvaniaHlsFile}