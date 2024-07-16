const express = require('express');
// const fs = require('fs');
const app = express();
const moment = require('moment');
const cors = require('cors');
const NodeCache = require('node-cache');
// const https = require('https');
const rateLimit = require('express-rate-limit');

// const axios = require('axios');
const fs = require('fs/promises');
const getMontanaData = require("./getMontanaData");
const getTexasData = require("./getTexasData");
const getStrimArkansasToken = require("./getStrimArkansasToken");



// const corsOptions = {
// //   origin: 'http://localhost:5001', 
// // origin: ['https://admin-panel.truckerguideapp.com/', 'https://truckerguideapp.com/'],
// origin: true,
// methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
// // methods: 'GET',
// preflightContinue: false,
// optionsSuccessStatus: 204,
// // allowedHeaders: ['Content-Type', 'Authorization']
// };
const corsOptions = {
    origin: '*', // Дозволяємо доступ з будь-якого джерела
    // origin: ['https://admin-panel.truckerguideapp.com/', 'https://truckerguideapp.com/'],
    methods: ['OPTIONS','GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],

    preflightContinue: false,
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'User-Agent', 'If-Modified-Since', 'Cache-Control', 'Range'], // Дозволяємо специфічні заголовки
    credentials: true, // Дозволяємо передачу креденцій через CORS
};

// app.use(cors(corsOptions));
// app.use(cors());

// const limiter = rateLimit({
//     windowMs: 10 * 1000, // 1 minute window
//     max: 7, // Limit each IP to 5 requests per `window` (here, per minute)
//     message: 'Too many requests from this IP, please try again after a minute',
//     skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
// });

// app.use(limiter);

// const cache = new NodeCache({ stdTTL: 300 });
const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
// ===== Middleware - save   in server log======
app.use(express.json());

app.use(async(req, res, next)=> {
    console.log("req.method=====>", req.method);
    const origin = req.get('Origin')|| req.get('Referer') || 'unknown-origin';
    const ip = req.ip;
    console.log(`Запит надійшов з домену: ==> ${origin}`);
    const {method, originalUrl,url} = req;
    const date = moment().format('DD-MM-YYYY_hh:mm:ss');
    const logEntry = `\n${method}/${origin}/ ${originalUrl} /ip: ${ip} /${date}`;
    await fs.appendFile("server.log", logEntry);
  next()
})
// ===========  montana
app.get('/montana', async (req, res) => {
    const apiKey = 'Nzk4MDdmODYtNWFhZS00YWU0LTg1MWQtYTM4ODlhNTk0OTVm';
    const url = 'https://app.mdt.mt.gov/atms/api/conditions/v1/current/images';
    const { id } = req.query
    if (!id) {
      return res.status(400).send('Параметр id є обов’язковим');
    }
    console.log(id);
    // --------- check img in cache -----------
    const cachedResult = cache.get(id);
    if (cachedResult) {
      console.log('Повертаємо результат з кешу');
      return res.redirect(cachedResult);
    }
// ---------------
    try {
      const response = await fetch(`${url}?apiKey=${apiKey}`);
      const data = await response.json();
      const resultImg = await getMontanaData(data, id);
    //   console.log("===> ",resultImg);
  
      if (resultImg) {
        res.redirect(resultImg)
// ----- save img  in cache -----
        cache.set(id, resultImg);

      } else {
        res.status(404).send('Дані з таким ID не знайдені');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Помилка сервера');
    }
  });
// ================== texas ==================
  app.get('/texas', async (req, res) => {
    const validParams = ["HOU", "ABL", "AMA", "ATL", "AUS", "BMT", "BWD", "BRY", "CHS", "CRP", "DAL", "ELP", "FTW", "LRD", "LBB", "ODA", "PAR", "PHR", "SJT", "SAT", "TYL", "WAC", "WFS", "YKM"];
    const { param, id } = req.query;

    if (!param || !id) {
      return res.status(400).send('Параметри "param" та "id" є обов’язковими');
    }
    if (!validParams.includes(param)) {
        return res.status(400).send('Невірний параметр');
      }
    // --------- cache
    const cacheKey = `${param}_${id}`;
    if (cache.has(cacheKey)) {
        console.log('Повертаємо результат з кешу TEXAS');
      return res.status(200).send(cache.get(cacheKey));
    }
    // ---------
  
    console.log(param, id);
    try {
        const imageData = await getTexasData(param, id);
        
        if (imageData) {
          const imgBuffer = Buffer.from(imageData, 'base64');
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': imgBuffer.length
          });
          res.end(imgBuffer);
        // -----  save caсhe
          cache.set(cacheKey, imgBuffer);
        // -----
        } else {
          res.status(404).send('Image not found');
        }
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
  })
//   ==== arkansas ======
// const apiLimiter = rateLimit({
//     windowMs:  100, // 10 second window
//     max: 5, // Limit each IP to 1 request per `window` (here, per 10 seconds)
//     message: 'Too many requests from this IP, please try again after 10 seconds',
//     skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
// });
// app.use('/arkansas', apiLimiter);
app.use((req, res, next) => {
    // res.header("Access-Control-Allow-Origin", "https://truckerguideapp.com");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});
app.options('/arkansas', cors(corsOptions));
  app.get("/arkansas", async (req, res) => {
    const { id } = req.query;
    console.log("Received ID:", id);
    if (!id) {
        return res.status(400).send('Параметри "param" та "id" є обов’язковими');
      }
      const cacheKey = `ar_${id}`;
    //   if (cache.has(cacheKey)) {
    //       console.log('Повертаємо результат з кешу Arkansas');
    //     return res.status(200).send(cache.get(cacheKey));
    //   }
    // ========
    // const cachedResult = cache.get(cacheKey);
    // if (cachedResult) {
    //     res.set('Content-Type', 'application/vnd.apple.mpegurl');
    //     console.log('Результат з кешу Arkansas', id, cachedResult);
    //     return res.status(200).send(cachedResult);
    // }
// =======
if (false) {
    // Якщо є кешований результат, використовуємо його
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    console.log('Результат з кешу Arkansas', id, cachedResult);

    // Відправляємо частину вмісту згідно з запитом Range, якщо він є
    const rangeHeader = req.headers['range'];
    if (rangeHeader) {
        console.log('Range header:', rangeHeader);
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : cachedResult.length - 1;

        const chunk = cachedResult.slice(start, end + 1);
        const contentLength = chunk.length;
        console.log("============> ", `bytes ${start}-${end}/${cachedResult.length}`);
        res.status(206) // Partial Content
           .set('Content-Length', contentLength)
           .set('Content-Range', `bytes ${start}-${end}`)
           .send(chunk);
    } else {
        // Відправляємо повний вміст, якщо запит без заголовка Range
        res.status(200).send(cachedResult);
    }
} else {
    try {
        // Виконуємо логіку отримання стріму з функції getStrimArkansasToken(id)
        const streamUrl = await getStrimArkansasToken(id);
        console.log("response result ==> ", streamUrl);

        if (streamUrl) {
            // Якщо стрім знайдено, відправляємо його клієнту
            res.set('Content-Type', 'application/vnd.apple.mpegurl');
            res.status(200).send(streamUrl);

            // Збереження результату у кеш
            // cache.set(cacheKey, streamUrl);
        } else {
            // Якщо стрім не знайдено, відправляємо відповідну помилку
            res.status(404).send('Стрім не знайдено');
        }
    } catch (error) {
        // Обробка помилок під час отримання стріму
        console.error('Error retrieving stream URL:', error);
        res.status(500).send('Error retrieving stream URL');
    }
}
// ======
    try {

 
        // const streamUrl = await getStrimArkansasToken(id);
        // console.log("response resoult ==> ",streamUrl);
// ===============
        // if (streamUrl) {
          
        //     res.set('Content-Type', 'application/vnd.apple.mpegurl');
        //     // res.set('Access-Control-Allow-Origin', '*');
        //     res.set("Accept-Ranges","bytes");
        //     res.set('Cache-Control', 'no-cache');
        //     // res.set("Access-Control-Allow-Headers","Content-Type, User-Agent, If-Modified-Since, Cache-Control, Range");
        //     // res.set("Access-Control-Allow-Credentials","true");

        //     // res.set("Cache-Control", "max-age=1")
        //     // res.set("Content-Length", "607")
        //     // res.set("Server", "FlashCom/3.5.7")
        //     // res.set("Date", "Fri, 12 Jul 2024 10:13:17 GMT")
        //     // res.send(streamUrl);
        //     const range = req.headers.range;
        //     if (range) {
        //         const parts = range.replace(/bytes=/, "").split("-");
        //         const start = parseInt(parts[0], 10);
        //         const end = parts[1] ? parseInt(parts[1], 10) : streamUrl.length - 1;
        //         const chunkSize = (end - start) + 1;

        //         const streamChunk = streamUrl.slice(start, end + 1); // Читання частини файлу

        //         res.set('Content-Range', `bytes ${start}-${end}/${streamUrl.length}`);
        //         res.set('Content-Length', chunkSize);
        //         res.status(206).send(streamChunk);
        //     } else {
        //         res.send(streamUrl);
        //     }
        //     // save cache
        //     cache.set(cacheKey, streamUrl);
        //   } else {
        //     res.status(404).send('Стрім не знайдено');
        //   }
        // res.send(streamUrl);
    //  ============================
    // if (streamUrl) {
    //     const range = req.headers.range;
    //     const buffer = Buffer.from(streamUrl); // Перетворюємо на буфер

    //     if (range) {
    //         const parts = range.replace(/bytes=/, "").split("-");
    //         const start = parseInt(parts[0], 10);
    //         const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
    //         const chunkSize = (end - start) + 1;

    //         const streamChunk = buffer.slice(start, end + 1); // Читання частини буфера

    //         res.set('Content-Range', `bytes ${start}-${end}/${buffer.length}`);
    //         res.set('Content-Length', chunkSize);
    //         res.set('Content-Type', 'application/vnd.apple.mpegurl');
    //         res.status(206).send(streamChunk);
    //     } else {
    //         res.set('Content-Length', buffer.length);
    //         res.set('Content-Type', 'application/vnd.apple.mpegurl');
    //         res.send(buffer);
    //     }

    //     // Збереження результату у кеш
    //     cache.set(cacheKey, buffer);
    // } else {
    //     res.status(404).send('Стрім не знайдено');
    // }

    // +++++++++++++++++++++++++++++++++++++++
    // if (streamUrl) {
    //     res.set('Content-Type', 'application/vnd.apple.mpegurl');
    //     res.status(200).send(streamUrl);

    //     // Збереження результату у кеш
    //     cache.set(cacheKey, streamUrl);
    // } else {
    //     res.status(404).send('Стрім не знайдено');
    // }
    // +++++++++++++++++
    } catch (error) {
        console.error('Error retrieving stream URL:', error);
        res.status(500).send('Error retrieving stream URL');
    }
  })
//   const sslOptions = {
//     key: fs.readFileSync('server.key'),
//     cert: fs.readFileSync('server.crt')
// };
app.listen(3000)
// const PORT = process.env.PORT || 3000;
// https.createServer(sslOptions, app).listen(PORT, () => {
//     console.log(`HTTPS server is running on port ${PORT}`);
// });
