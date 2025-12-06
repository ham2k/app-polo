/*
 * Copyright ©️ 2024, 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import DXCC_LOCATIONS from '../data/dxccLocations.json'

export function distanceOnEarth(location1, location2, options = {}) {
  let radius
  if (options.units === 'miles') {
    radius = 3958.8 // Radius of the Earth in miles
  } else {
    radius = 6371 // Radius of the Earth in km
  }

  const lat1 = deg2rad(location1?.lat ?? location1?.latitude)
  const lon1 = deg2rad(location1?.lon ?? location1?.longitude)
  const lat2 = deg2rad(location2?.lat ?? location2?.latitude)
  const lon2 = deg2rad(location2?.lon ?? location2?.longitude)

  if (!lat1 || !lon1 || !lat2 || !lon2) return null

  const sinLat = Math.sin((lat2 - lat1) / 2)
  const sinLon = Math.sin((lon2 - lon1) / 2)

  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return radius * c
}

export function bearingOnEarth(location1, location2) {
  const lat1 = deg2rad(location1?.lat ?? location1?.latitude)
  const lon1 = deg2rad(location1?.lon ?? location1?.longitude)
  const lat2 = deg2rad(location2?.lat ?? location2?.latitude)
  const lon2 = deg2rad(location2?.lon ?? location2?.longitude)

  if (!lat1 || !lon1 || !lat2 || !lon2) return null

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  const theta = Math.atan2(y, x)

  return (theta * 180 / Math.PI + 360) % 360 // in degrees
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

const THOUSANDS_DELIMITER_REGEX = /^(\d+)(\d\d\d)$/

export function fmtDistance(dist, options) {
  if (!dist) return ''

  let fixedPrecision = options.precision ?? 1
  if (options.precision === undefined && dist > 5)
    fixedPrecision = 0

  if (options.units === 'miles') {
    return `${dist.toFixed(fixedPrecision).replace(THOUSANDS_DELIMITER_REGEX, '$1,$2')} mi`
  } else {
    return `${dist.toFixed(fixedPrecision).replace(THOUSANDS_DELIMITER_REGEX, '$1.$2')} km`
  }
}

export function locationForQSONInfo(qsonInfo) {
  try {
    const grid = qsonInfo?.grid ?? qsonInfo?.guess?.grid

    if (grid && grid !== 'AA00' && grid !== 'AA00aa') {
      const [latitude, longitude] = gridToLocation(grid)
      return { latitude, longitude }
    }

    const entityPrefix = qsonInfo?.entityPrefix ?? qsonInfo?.guess?.entityPrefix
    const state = qsonInfo?.state ?? qsonInfo?.guess?.state
    if (entityPrefix) {
      const loc = DXCC_LOCATIONS[[entityPrefix, state?.toUpperCase()].join('-')] || DXCC_LOCATIONS[entityPrefix]
      if (loc) return { latitude: loc[1], longitude: loc[0] }
    }
    return null
  } catch (e) {
    return null
  }
}

export function distanceForQSON(qso, { units }) {
  const theirLocation = locationForQSONInfo(qso?.their)
  const ourLocation = locationForQSONInfo(qso?.our)
  return (theirLocation && ourLocation) ? distanceOnEarth(theirLocation, ourLocation, { units }) : null
}

export function bearingForQSON(qso) {
  const theirLocation = locationForQSONInfo(qso?.their)
  const ourLocation = locationForQSONInfo(qso?.our)
  return (theirLocation && ourLocation) ? bearingOnEarth(ourLocation, theirLocation) : null
}

export function degreesInMinutes(degrees) {
  const sign = degrees < 0 ? -1 : 1
  degrees = Math.abs(degrees)
  const d = Math.floor(degrees)
  const fractM = (degrees - d) * 60
  const m = Math.floor((degrees - d) * 60)
  const s = Math.round(((degrees - d) * 60 - m) * 60)

  return {
    degrees: sign * d,
    minutes: m,
    fractionalMinutes: fractM,
    seconds: s
  }
}

export function latitudeInMinutes(latitude) {
  const values = degreesInMinutes(latitude)
  return {
    ...values,
    direction: values.degrees < 0 ? 'S' : 'N',
    degrees: Math.abs(values.degrees),
  }
}

export function longitudeInMinutes(longitude) {
  const values = degreesInMinutes(longitude)
  return {
    ...values,
    direction: values.degrees < 0 ? 'W' : 'E',
    degrees: Math.abs(values.degrees),
  }
}
