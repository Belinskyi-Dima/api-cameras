async function getMontanaData({features}, id) {
    // console.log(features.length);
    const img = features.find(camera=> camera.id === id)

        if (img?.properties?.cameras.length > 0) {
            const imageUrl = img.properties.cameras[0].image;
            return imageUrl
        }
        return null;
          // return JSON.stringify(json, null, 2);
      
  }
  module.exports = getMontanaData;