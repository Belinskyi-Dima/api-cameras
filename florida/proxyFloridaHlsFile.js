// const { Readable } = require('node:stream');
// const requestOptions = {
//   method: 'GET',
//   headers: {
//     'accept': '*/*',
//     'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
//     'cache-control': 'no-cache',
//     'pragma': 'no-cache',
//     'referer': 'https://www.fl511.com',
//     'origin':'https://www.fl511.com',
//     'user-agent':
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
//   },
// };
// async function proxyFloridaHlsFile(req, res) {
//    try {
//     const id = Number(req.params.id);
//     const fileName = req.params.fileName;
//     const originUrl = req.query.originUrl
//   // if (!fileName || !token || !originUrl) {
//   //     return res.status(400).send('Bad params');
//   //   }
//     console.log('[ file ] id:', id, 'file:', fileName, "originUrl: ", originUrl);

//     if (!Number.isFinite(id)) {
//         return res.status(400).send('id must be a number');
//     }
//     let upstreamUrl = originUrl + fileName; 
//     console.log('[FL file] upstreamUrl:', upstreamUrl);

//     const upstreamRes = await fetch(upstreamUrl, requestOptions);
//     console.log(upstreamRes);
    
//     if (!upstreamRes.ok) {
//        const text = await upstreamRes.text().catch(() => '');
//       console.error('Upstream TS error:', upstreamRes.status, text.slice(0, 200));
//       return res.status(502).send('Failed to fetch TS');
//     }
    

//   //  if (fileName.endsWith('.ts')) {
//   //     res.setHeader('Content-Type', 'video/MP2T');

//   //     if (!upstreamRes.body) {
//   //       console.error('[FL file] no body');
//   //       return res.sendStatus(502);
//   //     }

//   //     const nodeStream = Readable.fromWeb(upstreamRes.body);
//   //     nodeStream.pipe(res);
//   //   } else {
//   //     const buf = Buffer.from(await upstreamRes.arrayBuffer());
//   //     res.end(buf);
//   //   } 
//    if (fileName.endsWith('.ts')) {
//       // TS-сегмент: читаємо повністю й віддаємо
//       const buf = Buffer.from(await upstreamRes.arrayBuffer());
//       res.setHeader('Content-Type', 'video/mp2t');
//       res.setHeader('Content-Length', buf.length);
//       return res.end(buf);
//     } else {
//       // наприклад, xflow.m3u8 чи щось інше текстове
//       const text = await upstreamRes.text();
//       res.setHeader(
//         'Content-Type',
//         'application/vnd.apple.mpegurl; charset=utf-8'
//       );
//       return res.send(text);
//     }
//   } catch (err) {
//     console.error('[proxyFloridaHlsFile] error:', err);
//     if (!res.headersSent) {
//       res.status(500).send('Internal proxy error');
//     }
//   }
// }
// src/controllers/florida/proxyFloridaHlsFile.js
const https = require('https');
const axios = require('axios');

// Агент тільки для Florida TS-запитів: вимикаємо перевірку TLS
const floridaHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function proxyFloridaHlsFile(req, res) {
  const id = Number(req.params.id);
  const fileName = req.params.fileName;
  const originUrl = req.query.originUrl;

  if (!Number.isFinite(id)) {
    return res.status(400).send('id must be a number');
  }
  if (!fileName || !originUrl) {
    return res.status(400).send('Bad params');
  }

  // console.log(
  //   '[ file ] id:',
  //   id,
  //   'file:',
  //   fileName,
  //   'originUrl: ',
  //   originUrl,
  // );

  const upstreamUrl = originUrl + fileName;
  console.log('[FL file] upstreamUrl:', upstreamUrl);

  try {
    const upstreamRes = await axios.get(upstreamUrl, {
      httpsAgent: floridaHttpsAgent,
      responseType: 'stream',
      headers: {
        accept: '*/*',
        'accept-language':
          'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        origin: 'https://www.fl511.com',
        referer: 'https://www.fl511.com/',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });

    if (upstreamRes.status < 200 || upstreamRes.status >= 300) {
      console.error(
        '[FL file] upstream bad status:',
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
      console.error('[FL file] stream error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end();
    });

    upstreamRes.data.pipe(res);
  } catch (err) {
    console.error('[proxyFloridaHlsFile] error:', err.message);

    if (err.response) {
      console.error(
        '[proxyFloridaHlsFile] upstream status:',
        err.response.status,
      );
    }
    if (err.cause) {
      console.error(
        '[proxyFloridaHlsFile] CAUSE:',
        err.cause,
      );
    }

    res.status(500).send('Internal error (Florida TS)');
  }
}

module.exports = { proxyFloridaHlsFile };

