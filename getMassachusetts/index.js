async function getMassachusetts(id) {
    try {
        const resultFetchData = await fetchData();
        
        if (resultFetchData && resultFetchData.length > 0) {
            const data = resultFetchData[0].data.listCameraViewsQuery.cameraViews;
            const resultFind = data.find(item => 
                item.parentCollection.uri === id && 
                Array.isArray(item.sources) && 
                item.sources.length > 0 && 
                item.sources[0].src !== null
            );
            if (resultFind) {
                // console.log(resultFind.sources[0].src);
                const response = await getMassachusettsChunklist(resultFind.sources[0].src, id);
                return response;  // Повертаємо значення response
            } 
            
            return null;
        }
        return null;
    } catch (error) {
        console.error("Помилка при отриманні даних:", error);
        return null;
    }
}


async function fetchData() {
    const url = 'https://mass511.com/api/graphql';

    const queries = [
        {
            "query": "query ($input: ListArgs!) { listCameraViewsQuery(input: $input) { cameraViews { category icon lastUpdated { timestamp timezone } title uri url sources { type src } parentCollection { title uri icon color location { routeDesignator } lastUpdated { timestamp timezone } } } totalRecords error { message type } } }",
            "variables": {
                "input": {
                    "west": -180,
                    "south": -85,
                    "east": 180,
                    "north": 85,
                    "sortDirection": "DESC",
                    "sortType": "ROADWAY",
                    "freeSearchTerm": "",
                    "classificationsOrSlugs": [],
                    "recordLimit": 300,
                    "recordOffset": 0
                }
            }
        }
    ];

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(queries)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Помилка:", error);
        return null;
    }
} 
async function getMassachusettsChunklist(url) {
 
     try {
     
        console.log("URL до основного плейлиста:", url);
        const response = await fetch(url);
        const data = await response.text();
        // console.log("Основний плейлист:", data);

        // Отримання базової URL для конвертації відносних шляхів
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        console.log("Базовий URL:", baseUrl);

        // Отримання chunklist URL з основного плейлиста
        const chunklistLine = data.split('\n').find(line => line.includes('.m3u8'));
        if (chunklistLine) {
            // Формування абсолютного URL для chunklist
            const chunklistUrl = chunklistLine.trim().startsWith('http') ? chunklistLine.trim() : baseUrl + chunklistLine.trim();
            // console.log("URL до chunklist:", chunklistUrl);

            // Отримання chunklist плейлисту
            const chunklistResponse = await fetch(chunklistUrl);
            const chunklistData = await chunklistResponse.text();
            // console.log("Chunklist плейлист:", chunklistData);

            // Отримання базової URL для chunklist
            const chunklistBaseUrl = chunklistUrl.substring(0, chunklistUrl.lastIndexOf('/') + 1);
            console.log("Базовий URL для chunklist:", chunklistBaseUrl);

            // Конвертування відносних URL в абсолютні
            const absoluteChunklistData = chunklistData.split('\n').map(line => {
                if (line && line.startsWith('media_')) {
                    const absoluteUrl = chunklistBaseUrl + line.trim();
                    // console.log("Конвертуємо URL:", line, "->", absoluteUrl);
                    return absoluteUrl;
                }
                return line;
            }).join('\n');

            // console.log("Абсолютний chunklist плейлист:", absoluteChunklistData);

            return absoluteChunklistData;
        } else {
            throw new Error('Chunklist не знайдено у відповіді.');
        }
    } catch (error) {
        console.error("Помилка при отриманні chunklist:", error);
        return null;
    }

   
    
}


module.exports = getMassachusetts;