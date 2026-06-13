/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { capitalizeString } from '@ham2k/lib-format-tools'

/**
 * Pure JSON-to-record mapper for the QRZCALL.EU JSON lookup endpoint
 * (`/v1/pub/callsign_json.php`). The endpoint returns either
 *   { success: true, api: '…', data: { …fields } }
 * on a hit, or
 *   { error: 'Callsign not found: XX9XX' }   (HTTP 404)
 *   { error: '…' }                            (other server errors)
 * on a miss/failure.
 *
 * Exported as its own module so it can be unit-tested without pulling in the
 * RTK Query / Redux runtime.
 *
 * @param {object} body  - parsed JSON body from the endpoint
 * @param {string} call  - the callsign that was queried (for friendly error msgs)
 * @returns {{ data?: object, error?: string }}
 */
export function parseQRZCALLJson (body, call) {
  const errorMsg = body?.error
  if (errorMsg) {
    if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('not found')) {
      return { error: `${call} not found` }
    }
    return { error: typeof errorMsg === 'string' ? errorMsg : 'QRZCALL JSON error' }
  }

  const info = body?.data
  if (!info) {
    return { error: 'QRZCALL response missing data object' }
  }

  return {
    data: {
      name: [
        capitalizeString(info.firstname, { content: 'name', force: false }),
        info.nickname ? `“${capitalizeString(info.nickname, { content: 'name', force: false })}”` : undefined,
        capitalizeString(info.lastname, { content: 'name', force: false })
      ].filter(x => x).join(' '),
      call: castString(info.callsign),
      allCalls: [castString(info.callsign)].concat(castString(info.prev_call).split(',')).filter(x => x),
      firstName: castString(info.firstname),
      lastName: castString(info.lastname),
      tz: castString(info.tz),
      gmtOffset: castNumber(info.gmtOffset),
      city: capitalizeString(info.address2, { content: 'address', force: false }),
      state: castString(info.state),
      country: capitalizeString(info.country, { force: false }),
      postal: castString(info.zip),
      county: capitalizeString(info.county, { force: false }),
      grid: castString(info.gridsquare),
      cqZone: castNumber(info.cqzone),
      ituZone: castNumber(info.ituzone),
      dxccCode: castNumber(info.dxcc),
      lat: castNumber(info.lat),
      lon: castNumber(info.lon),
      image: castString(info.image),
      imageInfo: []
    }
  }
}

export function castString (value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function castNumber (value) {
  if (value === undefined || value === null) return null
  const number = Number(value)
  if (isNaN(number)) return null
  return number
}
