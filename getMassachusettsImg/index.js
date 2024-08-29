// getMassachusettsImg
async function getMassachusettsImg(id) {
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
            if (resultFind && resultFind.url) {
                return resultFind.url;
                // console.log(resultFind.sources[0].src);
                // const response = await getMassachusettsChunklist(resultFind.sources[0].src, id);
                // return response;  // Повертаємо значення response
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
module.exports = getMassachusettsImg;