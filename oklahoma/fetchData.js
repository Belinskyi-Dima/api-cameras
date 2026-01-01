const path = require("path");

async function fetchData() {
    
  const apiUrl = 'https://oktraffic.org/api/CameraPoles';

const filter = {
    include: [
      {
        relation: 'mapCameras',
        scope: {
          include: 'streamDictionary',
          where: {
            status: { neq: 'Out Of Service' },
            type: 'Web',
            blockAtis: { neq: '1' }
          }
        }
      },
      {
        relation: 'cameraLocationLinks',
        scope: {
          include: ['linkedCameraPole', 'cameraPole']
        }
      }
    ]
  };

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

  
    'filter': JSON.stringify(filter)
  }
};


const res = await fetch(apiUrl, requestOptions);
    // читаємо ТІЛЬКИ ОДИН раз
  const bodyText = await res.text();
  if (!res.ok) {
    console.error('Bad status:', res.status);
    console.error('Body snippet:', bodyText.slice(0, 500));
    throw new Error(`HTTP error Oklahoma! Status: ${res.status}`);
    
    // throw new Error(`HTTP error Oklahoma! Status: ${res.status}, body: ${text}`);
  }

    let data;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    console.error('Cannot parse JSON, raw body snippet:', bodyText.slice(0, 500));
    throw e;
  }
  return data;
}
module.exports = {fetchData}