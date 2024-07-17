async function getIllinoisData(id, cachedResult) {

    if (cachedResult && cachedResult.features) {
        const resultFindCamera = cachedResult.features.find(item => item.attributes?.OBJECTID == id);
        if (resultFindCamera) {
            // console.log(resultFindCamera?.attributes?.SnapShot);
            return resultFindCamera?.attributes?.SnapShot;
        } 
    }
    return null;
}
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Error in fetchData:", err.message);
        throw err;  // Перенаправляємо помилку на вищий рівень
    }
}
function getIllinoisFromIllinoisDbJson (id, db) {
    const resultFindCamera = db.features.find(item => item.properties?.OBJECTID == id);
    if (resultFindCamera) {
        // console.log(resultFindCamera?.attributes?.SnapShot);
        return resultFindCamera?.properties?.SnapShot;
    } 
}
module.exports = {getIllinoisData, fetchData, getIllinoisFromIllinoisDbJson};