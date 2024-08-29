function findMassImg(data) {
    console.log(data);
    try {
  
        
        if (data && data.length > 0) {
            const data = data[0].data.listCameraViewsQuery.cameraViews;
            const resultFind = data.find(item => 
                item.parentCollection.uri === id && 
                Array.isArray(item.sources) && 
                item.sources.length > 0 && 
                item.sources[0].src !== null
            );
            if (resultFind.url) {
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
module.exports = findMassImg;