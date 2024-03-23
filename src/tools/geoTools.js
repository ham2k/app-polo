export function distanceOnEarth (location1, location2, options = {}) {
  let radius
  if (options.units === 'miles') {
    radius = 3958.8 // Radius of the Earth in miles
  } else {
    radius = 6371 // Radius of the Earth in km
  }

  const lat1 = location1.lat ?? location1.latitude
  const lon1 = location1.lon ?? location1.longitude
  const lat2 = location2.lat ?? location2.latitude
  const lon2 = location2.lon ?? location2.longitude

  if (!lat1 || !lon1 || !lat2 || !lon2) return null

  const dLat = deg2rad(lat2 - lat1) // deg2rad below
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radius * c
}

function deg2rad (deg) {
  return deg * (Math.PI / 180)
}

export function fmtDistance (dist, options) {
  if (!dist) return ''

  if (options.units === 'miles') {
    return `${dist.toFixed(0)} mi`
  } else {
    return `${dist.toFixed(0)} km`
  }
}
