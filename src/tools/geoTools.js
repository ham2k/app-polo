import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import DXCC_LOCATIONS from '../data/dxccLocations.json'

export function distanceOnEarth (location1, location2, options = {}) {
  let radius
  if (options.units === 'miles') {
    radius = 3958.8 // Radius of the Earth in miles
  } else {
    radius = 6371 // Radius of the Earth in km
  }

  const lat1 = location1?.lat ?? location1?.latitude
  const lon1 = location1?.lon ?? location1?.longitude
  const lat2 = location2?.lat ?? location2?.latitude
  const lon2 = location2?.lon ?? location2?.longitude

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

const THOUSANDS_DELIMITER_REGEX = /^(\d+)(\d\d\d)$/

export function fmtDistance (dist, options) {
  if (!dist) return ''

  if (options.units === 'miles') {
    return `${dist.toFixed(0).replace(THOUSANDS_DELIMITER_REGEX, '$1,$2')} mi`
  } else {
    return `${dist.toFixed(0).replace(THOUSANDS_DELIMITER_REGEX, '$1.$2')} km`
  }
}

export function locationForQSONInfo (qsonInfo) {
  try {
    const grid = qsonInfo?.grid ?? qsonInfo?.guess?.grid ?? qsonInfo?.qrzInfo?.grid

    if (grid) {
      const [latitude, longitude] = gridToLocation(grid)
      return { latitude, longitude }
    }

    const entityPrefix = qsonInfo?.entityPrefix ?? qsonInfo?.guess?.entityPrefix ?? qsonInfo?.qrzInfo?.entityPrefix
    const state = qsonInfo?.state ?? qsonInfo?.guess?.state ?? qsonInfo?.qrzInfo?.state
    if (entityPrefix) {
      const loc = DXCC_LOCATIONS[[entityPrefix, state].join('-')] || DXCC_LOCATIONS[entityPrefix]
      if (loc) return { latitude: loc[1], longitude: loc[0] }
    }
    return null
  } catch (e) {
    console.error('Error in locationForQSONInfo', e)
    return null
  }
}

export function distanceForQSON (qso, { units }) {
  const theirLocation = locationForQSONInfo(qso?.their)
  const ourLocation = locationForQSONInfo(qso?.our)
  return (theirLocation && ourLocation) ? distanceOnEarth(theirLocation, ourLocation, { units }) : null
}
