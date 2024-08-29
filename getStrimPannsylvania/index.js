async function getStrimPannsylvania(cameraId, stream) {
    const url = `https://www.511pa.com/Camera/GetVideoUrl?cameraId=${cameraId}`;

    const resToken1 = await fetchToken1(url);
    // console.log(resToken1);
    const urlPost = `https://pa.arcadis-ivds.com/api/SecureTokenUri/GetSecureTokenUriBySourceId`;
    const resToken2 = await fetchToken2(urlPost, resToken1);
    // console.log(resToken2);
    const validatorStream = stream.replace("index", "stream")
    const resToken3 = await fetchToken3(resToken2, validatorStream);
    console.log(resToken3);
    
        return resToken3;
}
async function fetchToken1(url) {
    const headers = {
        // ":authority": "www.511pa.com",
        // ":method": "GET",
        // ":path": "/Camera/GetVideoUrl?cameraId=3942--10&_=1724927810625",
        // ":scheme": "https",
        // "__requestverificationtoken": "YM_8Ua6scweo34DwBUuvwlbJoStNEzoWG7vmpidQkBXI1_d01GXAcfJvrTBrhJipNfDuMpQE4Stf5caWKks5D6lx7zc1",
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6",
        "cookie": "_culture=en; FeatureSlideModalVersion=1; _ga=GA1.1.2021839495.1721304721; session-id=FE593941159544639F82917AB433A705290ED5E8D5FB07E8A87A0222127E9A22A3CD82071D63950ECB1A1F39E3BEE3D2366CFD3062987EED2F774500F5D79A1722BCD0A2178CC6739A5AF13D685527797AAB4CD2DC580D4A1AC8C73257359B3BC47603B4253485FD4BDEE031465330DC7B79406EBF565D0B9CAF6FB0D4EBCF33; session=session; __RequestVerificationToken=2jUsDaGF_W38MN3DU7MFbo4PfP5uKinsxc0DbHpyaZ7WB7MOyIR6xJ57HE5hIYpmd0mas0D_lK-qbP_ruTsqYbT93Gg1; map={%22selectedLayers%22:[%22Cameras%22]%2C%22prevZoom%22:10%2C%22prevLatLng%22:[41.423421530290454%2C-75.91484010119093]%2C%22mapView%22:%222024-08-05T15:31:49.513Z%22}; _ga_3N4G61LZ3E=GS1.1.1724930856.16.1.1724930871.0.0.0",
        "priority": "u=1, i",
        "referer": "https://www.511pa.com/cctv?start=100&length=50&order%5Bi%5D=1&order%5Bdir%5D=asc",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
    };

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            // console.log(data);
            return data
        } else {
            console.error('HTTP Error:', response.status);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}
async function fetchToken2(url, body) {
    const headers = {
        // ":authority": "pa.arcadis-ivds.com",
        // ":method": "POST",
        // ":path": "/api/SecureTokenUri/GetSecureTokenUriBySourceId",
        // ":scheme": "https",
        "__requestverificationtoken": "YM_8Ua6scweo34DwBUuvwlbJoStNEzoWG7vmpidQkBXI1_d01GXAcfJvrTBrhJipNfDuMpQE4Stf5caWKks5D6lx7zc1",
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6",
        "content-length": "93",
        "content-type": "application/json",
        "origin": "https://www.511pa.com",
        "priority": "u=1, i",
        "referer": "https://www.511pa.com/",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    };
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            const data = await response.json();
            // console.log(data);
            return data
        } else {
            console.error('HTTP Error:', response.status);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function fetchToken3(token, stream) {
    // const headers = {
    //     // ":authority": "pa-se3.arcadis-ivds.com:8200",
    //     // ":method": "GET",
    //     // ":path": "/chan-3942/stream.m3u8?token=a2ca8359d1ef2586f908fe662ac98a7ae7aa9c45b0cd302c4c5e0349673a2bdb",
    //     // ":scheme": "https",
    //     "accept": "*/*",
    //     "accept-encoding": "gzip, deflate, br, zstd",
    //     "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6",
    //     // "origin": "https://www.511pa.com",
    //     "priority": "u=1, i",
    //     "referer": "https://www.511pa.com/",
    //     "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
    //     "sec-ch-ua-mobile": "?0",
    //     "sec-ch-ua-platform": "\"Windows\"",
    //     "sec-fetch-dest": "empty",
    //     "sec-fetch-mode": "cors",
    //     "sec-fetch-site": "cross-site",
    //     "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    // };
    const headers = {
        // ":authority": "pa-se3.arcadis-ivds.com:8200",
        // ":method": "GET",
        // ":path": "/chan-3942/index.m3u8?token=a2ca8359d1ef2586f908fe662ac98a7ae7aa9c45b0cd302c4c5e0349673a2bdb",
        // ":scheme": "https",
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6",
        "origin": "https://www.511pa.com",
        "priority": "u=1, i",
        "referer": "https://www.511pa.com/",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    };
    const newStream = `${stream}${token}`
    console.log("newStream ==> ", newStream);
    
    try {
        const response = await fetch(newStream, {
            method: "GET",
            headers: headers,
            // body: JSON.stringify(body)
        });
        
        if (response.ok) {
            // const data = await response.json();
            const data = await response.text()
            // console.log("===========> ",data);
            return data
        } else {
            console.error('HTTP Error:', response.status);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
    
}
module.exports = getStrimPannsylvania;