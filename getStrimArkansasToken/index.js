const { Readable } = require('stream');
const m3u8Parser = require('m3u8-parser');

async function getStrimArkansasToken(id) {
    
const url = `https://actis.idrivearkansas.com/index.php/api/cameras/feed/${id}.m3u8`;

// const headers = {
//     'authority': 'actis.idrivearkansas.com',
//     'method': 'GET',
//     // 'path': '/index.php/api/cameras/feed/478.m3u8',
//     'scheme': 'https',
//     'Accept': '*/*',
//     'Accept-Encoding': 'gzip, deflate, br, zstd',
//     'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
//     'Origin': 'https://www.idrivearkansas.com',
//     'Priority': 'u=1, i',
//     'Referer': 'https://www.idrivearkansas.com/',
//     'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
//     'Sec-Ch-Ua-Mobile': '?0',
//     'Sec-Ch-Ua-Platform': '"Windows"',
//     'Sec-Fetch-Dest': 'empty',
//     'Sec-Fetch-Mode': 'cors',
//     'Sec-Fetch-Site': 'same-site',
//     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
// };
const headers = {
         'authority': 'actis.idrivearkansas.com',
    'method': 'GET',
//     // 'path': '/index.php/api/cameras/feed/478.m3u8',
    'scheme': 'https',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
    'Host': 'actis.idrivearkansas.com',
    'Origin': 'https://www.idrivearkansas.com',
    'Referer': 'https://www.idrivearkansas.com/',
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};


try {
    const response = await fetch(url, { headers, redirect: 'manual' });
    if (response.status === 302) {
      const location = response.headers.get('location');
      const result = await getArkansasChunklist(location, id);
      return result;
    } else {
      console.log('Unexpected status code:', response.status);
      return null; // or throw an error
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
async function getArkansasChunklist(url, id) {
    // const headers = {
    //     'Accept': '*/*',
    //     'Accept-Encoding': 'gzip, deflate, br, zstd',
    //     'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    //     'Connection': 'keep-alive',
    //     'Host': '7212406.r.worldssl.net',
    //     'Origin': 'null',
    //     'Referer': 'https://www.idrivearkansas.com/',
    //     'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    //     'Sec-Ch-Ua-Mobile': '?0',
    //     'Sec-Ch-Ua-Platform': '"Windows"',
    //     'Sec-Fetch-Dest': 'empty',
    //     'Sec-Fetch-Mode': 'cors',
    //     'Sec-Fetch-Site': 'cross-site',
    //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    //   };
    const headers = {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Host': '7212406.r.worldssl.net',
        'Origin': 'https://www.idrivearkansas.com',
        'Referer': 'https://www.idrivearkansas.com/',
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    };
      

    try {
        const response = await fetch(url, { headers });
        const data = await response.text();
        const result = getArKansasStrim(data, id);
        console.log("--> ",result);
        // return result;
        try {
            // const headers = {
            //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, як Gecko) Chrome/126.0.0.0 Safari/537.36',
            //     'Referer': 'https://www.idrivearkansas.com/'
            //   };
            const chunklistResponse = await fetch(result, {headers});
            const resultStrim = await chunklistResponse.text();
            // console.log("+++++++", resultStrim);
                //  Перетворюємо відносні URL на абсолютні
            const baseUrl = result.substring(0, result.lastIndexOf('/') + 1);
            const absoluteResultStrim = makeUrlsAbsolute(resultStrim, baseUrl);
            // console.log("========",baseUrl);
            // console.log("---------",absoluteResultStrim);
            return absoluteResultStrim;
   
  
            return resultStrim;
          } catch (error) {
            console.error('Error:', error);
            throw error;
          }

  
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
}
function getArKansasStrim (data, id) {
    const defaultUrl = `https://7212406.r.worldssl.net/7212406/_definst_/idrive_${id}_base.stream/`;
    const regex = /chunklist_w[^\s]+/;
    const match = data.match(regex);
    if (match) {
    //   console.log('Found:', match[0]);
      const urlStrim = `${defaultUrl}${match[0]}`;
      return urlStrim;
   
    } else {
      console.log('No match found');
    }

}
// function makeUrlsAbsolute(m3u8Content, baseUrl) {
//     return m3u8Content.replace(/(media-[^\s]+)/g, (match) => `${baseUrl}${match}`);
// }
// function makeUrlsAbsolute(m3u8Content, baseUrl) {
//     return m3u8Content.replace(/^(?!#)(.*\.ts)/gm, (match) => {
//         if (match.startsWith('http')) {
//             return match; // URL вже абсолютний
//         } else {
//             return baseUrl + match; // Перетворюємо відносний URL на абсолютний
//         }
//     });
// }
function makeUrlsAbsolute(m3u8Content, baseUrl) {
    return m3u8Content.replace(/^(?!#)(.*\.ts\?token=.*)$/gm, (match) => {
        if (match.startsWith('http')) {
            return match; // URL вже абсолютний
        } else {
            return baseUrl + match; // Перетворюємо відносний URL на абсолютний
        }
    });
}

module.exports = getStrimArkansasToken;
// https://7212406.r.worldssl.net/7212406/_definst_/idrive_478_base.stream/