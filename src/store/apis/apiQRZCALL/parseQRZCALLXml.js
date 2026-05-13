/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { capitalizeString } from '../../../tools/capitalizeString'

/**
 * Pure XML-to-record mapper for the QRZCALL.EU `<QRZCALLDatabase>` document
 * (already parsed by fast-xml-parser). Exported as its own module so it can
 * be unit-tested without pulling in the RTK Query / Redux runtime.
 *
 * @param {object} xml          - parsed XML object from fast-xml-parser
 * @param {string} call         - the callsign that was queried (for friendly error msgs)
 * @returns {{ data?: object, error?: string }}
 */
export function parseQRZCALLXml (xml, call) {
  const errorTag = xml?.QRZCALLDatabase?.Error
  if (errorTag) {
    if (typeof errorTag === 'string' && errorTag.toLowerCase().includes('not found')) {
      return { error: `${call} not found` }
    }
    return { error: typeof errorTag === 'string' ? errorTag : 'QRZCALL XML error' }
  }

  const callsignInfo = xml?.QRZCALLDatabase?.Callsign
  if (!callsignInfo) {
    return { error: 'QRZCALL response missing <Callsign> element' }
  }

  return {
    data: {
      name: [
        capitalizeString(callsignInfo.fname, { content: 'name', force: false }),
        callsignInfo.nickname ? `“${capitalizeString(callsignInfo.nickname, { content: 'name', force: false })}”` : undefined,
        capitalizeString(callsignInfo.name, { content: 'name', force: false })
      ].filter(x => x).join(' '),
      call: castString(callsignInfo.call),
      allCalls: [castString(callsignInfo.call)].concat(castString(callsignInfo.xref).split(',')).filter(x => x),
      firstName: castString(callsignInfo.fname),
      lastName: castString(callsignInfo.name),
      tz: castString(callsignInfo.TimeZone),
      gmtOffset: castNumber(callsignInfo.GMTOffset),
      city: capitalizeString(callsignInfo.addr2, { content: 'address', force: false }),
      state: castString(callsignInfo.state),
      country: capitalizeString(callsignInfo.country, { force: false }),
      postal: castString(callsignInfo.zip),
      county: capitalizeString(callsignInfo.county, { force: false }),
      grid: castString(callsignInfo.grid),
      cqZone: castNumber(callsignInfo.cqzone),
      ituZone: castNumber(callsignInfo.ituzone),
      dxccCode: castNumber(callsignInfo.dxcc),
      lat: castNumber(callsignInfo.lat),
      lon: castNumber(callsignInfo.lon),
      image: castString(callsignInfo.image),
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
