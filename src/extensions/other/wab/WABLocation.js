/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import proj4 from 'proj4/dist/proj4-src.js'

proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs')
proj4.defs('EPSG:29903', '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +a=6377340.189 +rf=299.3249646 +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +units=m +no_defs +type=crs')
proj4.defs('EPSG:32630', '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs +type=crs')

const osGridPrefixes = [
  ['SV', 'SW', 'SX', 'SY', 'SZ', 'TV', 'TW'],
  ['SQ', 'SR', 'SS', 'ST', 'SU', 'TQ', 'TR'],
  ['SL', 'SM', 'SN', 'SO', 'SP', 'TL', 'TM'],
  ['SF', 'SG', 'SH', 'SJ', 'SK', 'TF', 'TG'],
  ['SA', 'SB', 'SC', 'SD', 'SE', 'TA', 'TB'],
  ['NV', 'NW', 'NX', 'NY', 'NZ', 'OV', 'OW'],
  ['NQ', 'NR', 'NS', 'NT', 'NU', 'OQ', 'OR'],
  ['NL', 'NM', 'NN', 'NO', 'NP', 'OL', 'OM'],
  ['NF', 'NG', 'NH', 'NJ', 'NK', 'OF', 'OG'],
  ['NA', 'NB', 'NC', 'ND', 'NE', 'OA', 'OB'],
  ['HV', 'HW', 'HX', 'HY', 'HZ', 'JV', 'JW'],
  ['HQ', 'HR', 'HS', 'HT', 'HU', 'JQ', 'JR'],
  ['HL', 'HM', 'HN', 'HO', 'HP', 'JL', 'JM']
]

const CI_BBOX = [-2.988281, 48.980217, -1.625977, 49.759978]
const IRE_BBOX = [-10.909424, 51.406059, -5.383301, 55.391592]

function OSGBPrefix (e, n) {
  return osGridPrefixes?.[Math.floor(n / 100000)]?.[Math.floor(e / 100000)]
}

function IrishPrefix (e, n) {
  const alphabet = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
  return alphabet[20 - Math.floor(n / 100000) * 5 + Math.floor(e / 100000)]
}

function MGRSPrefix (e, n) {
  const eAlphabet = 'STUVWXYZ'
  const nAlphabet = 'ABCDEFGHJKLMNPQRSTUV'
  const ePrefix = eAlphabet[Math.floor(e / 100000) - 1]
  const nPrefix = nAlphabet[(Math.floor(n / 100000) + 5) % 20] // zone 'F' start
  return ePrefix + nPrefix
}

function WABSquare (lat, lon, prefixFunc, projection) {
  const [e, n] = proj4('EPSG:4326', projection, [lon, lat])
  const prefix = prefixFunc(e, n)
  if (prefix) {
    return `${prefix}${Math.floor((e % 100000) / 10000)}${Math.floor((n % 100000) / 10000)}`
  }
}

export function locationToWABSquare (latitude, longitude) {
  let prefixFunc = OSGBPrefix
  let projection = 'EPSG:27700'

  if (longitude > CI_BBOX[0] && longitude < CI_BBOX[2] &&
      latitude > CI_BBOX[1] && latitude < CI_BBOX[3]) {
    prefixFunc = MGRSPrefix
    projection = 'EPSG:32630'
  } else if (longitude > IRE_BBOX[0] && longitude < IRE_BBOX[2] &&
             latitude > IRE_BBOX[1] && latitude < IRE_BBOX[3]) {
    prefixFunc = IrishPrefix
    projection = 'EPSG:29903'
  }
  return WABSquare(latitude, longitude, prefixFunc, projection)
}
