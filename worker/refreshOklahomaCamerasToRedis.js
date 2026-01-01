const path = require("path");
const fs = require('fs/promises');

// const cron = require("node-cron");
// const Redis = require("ioredis");
// const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");

const { fetchData } = require("../oklahoma/fetchData");
// const {saveOklahomaCameras} = require("../core/cacheMemory")
const { saveStateCameras } = require('../cache/roadCamerasCache');
const {getTtlToNextRotationSec} = require("../oklahoma/getTtlToNextRotationSec")
const folderPath = path.join(__dirname, "../oklahoma/result_camera");
const filePath = path.join(folderPath, "oklahoma_cameras.json");

// const data = require("../controllers/oklahoma/result_camera/oklahoma_cameras1.json")
// require("../controllers/oklahoma/fetchData")

async function refreshOklahomaCamerasToRedis() {
  console.log("[OK] refresh to redis: start");
  const data = await fetchData();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Empty data from fetchData");
  }


//   await redis.set("ok:cameras:all", JSON.stringify(payload));
  // await saveStateCameras('oklahoma', payload)

  // console.log(data);

    // await saveStateCameras('oklahoma', payload)

  const arrNew = data.map(item => {
    // console.log(item);
    
    if (item?.mapCameras.length > 0 ) {
      // console.dir(item, {depth: null});
      const camera = item.mapCameras[0]
      return {
        id: item.id,
        cameraId: camera.streamDictionary.id,
        name: camera.streamDictionary.streamName,
        lat: camera.latitude,
        lon: camera.longitude,
        streamKey: camera.streamDictionary.streamKey,
        streamSrc: camera.streamDictionary.streamSrc,
        
      }
    }
  }).filter(item=> item !== undefined )
        // console.log(arrNew.length);
        
  
  if (Array.isArray(arrNew) && data.length > 0) {
    const payload = {
      updatedAt: new Date().toISOString(),
      items: arrNew,
    };

    const ttlSec = getTtlToNextRotationSec(); 
    console.log("ttlSec: ", ttlSec);
    
    await saveStateCameras('oklahoma', payload, ttlSec)
      // 1. Створюємо папку, якщо її ще немає
      // await fs.mkdir(folderPath, { recursive: true });

      // // 2. Пишемо у файл
      // await fs.writeFile(
      //   filePath,
      //   JSON.stringify(payload, null, 2),
      //   "utf8"
      // );

      console.log("Saved to:", filePath);
    } else {
      console.log("Порожній або не масив resultFetchData");
    }

  console.log("[OK] refresh to redis: done, count =",  "data: ",data.length," || arrNew: ",arrNew.length);
}

// запустити один раз при старті
// refreshOklahomaCamerasToRedis().catch(console.error);

// повісити cron
// cron.schedule(
//   "0 12 * * *",
//   () => refreshOklahomaCamerasToRedis().catch(console.error),
//   { timezone: "America/Chicago" }
// );
module.exports = {refreshOklahomaCamerasToRedis}
// // десь в контролері:
// async function getOklahomaCameras(req, res) {
//   try {
//     const raw = await redis.get("ok:cameras:all");
//     if (!raw) {
//       return res.status(503).json({ error: "No camera data yet" });
//     }
//     const data = JSON.parse(raw);
//     res.json(data);
//   } catch (err) {
//     console.error("getOklahomaCameras error", err);
//     res.status(500).json({ error: "Internal error" });
//   }
// }