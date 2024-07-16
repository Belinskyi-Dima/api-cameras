
async function getTexasData(state, id) {
    const resultFetch = await fetchCamerasLocation(state).then(data => data);
    const arrResultFetch = Object.keys(resultFetch);
  
    for (const item of arrResultFetch) {
      if (item === 'roadwayCctvStatuses') {
        const arrItems = Object.keys(resultFetch[item]);
  
        for (const el of arrItems) {
          for (const it of resultFetch[item][el]) {
            if (it.latString === id) {
              const icd_Id = it.icd_Id;
            //   const icd_Id = it.name;
              const resultNormalaseName = await normaliseName(icd_Id);
              const resultUrlImg = await getImgUrl(resultNormalaseName, state).then(data => data);
              return resultUrlImg['snippet'];
            }
          }
        }
      }
    }
  
    return null; // Повертаємо null, якщо не знайдено відповідного id
  }
async function fetchCamerasLocation (state) {
    const resultFetch = await fetch(`https://its.txdot.gov/its/DistrictIts/GetCctvStatusListByDistrict?districtCode=${state}`)
     .then(res=>res.json())
     return resultFetch
 }
 
 
 async function normaliseName(str) {
     return str.replace(/ /g, '%20');
 }
 
 async function getImgUrl(name, state) {
 
     try {
     return await fetch(`https://its.txdot.gov/its/DistrictIts/GetCctvSnapshotByIcdId?icdId=${name}&districtCode=${state}`).then(res=>res.json())
         
     } catch (err) {
         console.log(err.message);
         return null
     }
 }
module.exports = getTexasData;