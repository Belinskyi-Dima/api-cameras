// const getMassachusetts = require("./getMassachusetts");
// const getMassachusettsImg = require("./getMassachusettsImg");
// const {fetchDataMass, findMassImg} = require("./findMassImg/index.js");
// const moment = require('moment');
// const axios = require('axios');
// const https = require('https');

const express = require('express');
// const fs = require('fs');
const app = express();

const cors = require('cors');
const NodeCache = require('node-cache');

const rateLimit = require('express-rate-limit');


const fs = require('fs/promises');
const getMontanaData = require("./getMontanaData");
const getTexasData = require("./getTexasData");
const getStrimArkansasToken = require("./getStrimArkansasToken");
const {getIllinoisData, fetchData, getIllinoisFromIllinoisDbJson} = require("./getIllinoisData");
const illinosi_db = require("./getIllinoisData/illinosi_db.json");
const getStrimPannsylvania = require("./getStrimPannsylvania");
const {getOklahomaCameras} = require("./oklahoma/index_semphore");
const {getFlorida, proxyFloridaHlsFile} = require("./florida/index_semphore");
const {getPenssylvania, } = require("./penssyilvania/index_semphore");


const corsOptions = {
    origin: '*', // Дозволяємо доступ з будь-якого джерела
    // origin: ['https://admin-panel.truckerguideapp.com', 'https://truckerguideapp.com', 'https://admin-panel.truckmaster.app', 'https://truckmaster.app'],
    methods: ['OPTIONS','GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],

    preflightContinue: false,
    optionsSuccessStatus: 204,
    // allowedHeaders: ['Content-Type', 'User-Agent', 'If-Modified-Since', 'Cache-Control', 'Range'], // Дозволяємо специфічні заголовки
    credentials: true, // Дозволяємо передачу креденцій через CORS
};


const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
// ===== Middleware - save   in server log======
app.use(express.json());

app.set('trust proxy', 1); // щоб req.ip працював через проксі Render
const limiter = rateLimit({
  windowMs: 60_000,
  max: 120, // 120 req/хв на IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use((req, res, next) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = typeof xff === 'string' ? xff.split(',')[0].trim() : req.ip;

  console.log(JSON.stringify({
    t: new Date().toISOString(),
    ip,
    method: req.method,
    url: req.originalUrl,
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    ua: req.headers['user-agent'],
  }));
  next();
});
// app.use(async(req, res, next)=> {
//     // console.log("req.method=====>", req.method);
//     const origin = req.get('Origin')|| req.get('Referer') || 'unknown-origin';
//     const ip = req.ip;
//     // console.log(`Запит надійшов з домену: ==> ${origin}`);
//     const {method, originalUrl,url} = req;
//     const date = moment().format('DD-MM-YYYY_hh:mm:ss');
//     const logEntry = `\n${method}/${origin}/ ${originalUrl} /ip: ${ip} /${date}`;
//     await fs.appendFile("server.log", logEntry);
//   next()
// })
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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


  })
//  ============= illinois ===========================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Дозволяємо доступ з будь-якого джерела
    res.header('Access-Control-Allow-Methods', 'GET'); // Дозволяємо тільки GET запити
    next();
});
app.get("/illinois", async (req, res) => {
    
    
    const { id } = req.query;
    // // console.log("Received ID:", id);
    if (!id) {
        return res.status(400).send('Параметри "param" та "id" є обов’язковими');
      }
   
    try {

        const cacheKey = `illinois_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('Знайдено дані в кеші для ID:', id);
            // Використовуємо дані з кешу
            res.set('Content-Type', 'image/jpeg'); // Встановлюємо тип відповіді на зображення
            res.send(cachedData);
        } else {

            const resultGetIllinois = await getIllinoisFromIllinoisDbJson(id, illinosi_db);
            console.log(resultGetIllinois);
      if (resultGetIllinois) {
          const imageResponse = await fetch(resultGetIllinois);

          if (imageResponse.ok) {
              // Якщо зображення успішно завантажено, повернути його клієнту
              const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
              cache.set(cacheKey, imageBuffer, 60);
              // Відправляємо зображення клієнту
              res.set('Content-Type', 'image/jpeg'); // Встановлюємо тип відповіді на зображення
              res.send(imageBuffer);;
          } else {
              // Якщо виникла помилка при завантаженні зображення, повернути відповідний статус помилки
              res.status(imageResponse.status).send(`Помилка завантаження зображення: ${imageResponse.statusText}`);
          }
          // res.redirect(resultGetIllinois)
      } else {
          res.status(404).send('Дані з таким ID не знайдені');
      }

        }

      
        
    } catch (error) {
        console.error("Error fetching Illinois data:", error);
        //         return res.status(500).send('Сталася внутрішня помилка сервера');
    }
    })
 
// ----------pennsylvania
    app.options('/pennsylvania', cors(corsOptions));
    app.get("/pennsylvania", async (req, res) => {
        // const json = require("./db.json");
        const { id, stream } = req.query;
        // const baseURL = `${req.protocol}://${req.get('host')}`;
        // console.log("Received ID:", id);
        // console.log("stream Url: ", stream);
        
        if (!id) {
            return res.status(400).send('Параметри "param" та "id" є обов’язковими');
        }
        try {
            const streamUrl = await getStrimPannsylvania(id, stream);
            if (streamUrl) {
                res.status(200).send(streamUrl);
            }

        } catch (error) {
            console.error('Error retrieving stream URL:', error);
            res.status(500).send('Error retrieving stream URL');
            
        }
    
    });
// ============ oklahoma ==================
   app.get("/oklahoma/:id",getOklahomaCameras)
// ========== florida 
  app.get('/cameras/api/v1/florida/:id', getFlorida); 
  // app.get('/api/v1/florida/:id/:fileName', proxyFloridaHlsFile);
// ============ pensailvania
  app.get('/cameras/api/v1/penssylvania/:id', getPenssylvania); 
  // app.get('/api/v1/penssylvania/:id/:fileName', proxyPenssylvaniaHlsFile);

    // https://api-cameras.onrender.com/illinois?id=1487
    // http://localhost:3000/arkansas?id=314

    // http://localhost:3000/oklahoma/3
    // https://api-cameras.onrender.com/oklahoma/3
    // https://api-cameras.onrender.com/illinois?id=1639
    // https://api-cameras.onrender.com/pennsylvania?id=3942--10&stream=https://pa-se3.arcadis-ivds.com:8200/chan-3942/index.m3u8
    
      // http://127.0.0.1:3000/cameras/api/v1/penssylvania/5437?originUrl=https://pa-se1.arcadis-ivds.com:8200/chan-3287/
      // https://cameras.trucker-guide.com/cameras/api/v1/florida/31?originUrl=https://dis-se6.divas.cloud:8200/chan-60_h/

    app.listen(3000)
