/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseQRZCALLJson, castString, castNumber } from './parseQRZCALLJson'

// Real response shape returned by api.qrzcall.eu/v1/pub/callsign_json.php
// captured from production for callsign PA4R. Empty DB fields come back as
// JSON null (the endpoint maps them with `?: null`); dxcc/lat/lon are numbers.
const PA4R_JSON = {
  success: true,
  api: 'QRZCALL JSON API v1.0',
  data: {
    callsign: 'PA4R',
    prev_call: null,
    firstname: 'Ronald',
    lastname: 'DHer',
    nickname: 'Ron',
    born: 1965,
    email: null,
    url: null,
    address1: 'address 1',
    address2: 'Wijk en Aalburg',
    zip: '4261',
    qth: null,
    state: 'NB',
    county: null,
    country: 'Netherlands',
    dxcc: 263,
    dxcc_country: 'Netherlands',
    continent: 'EU',
    lat: 51.760403,
    lon: 5.111732,
    ituzone: '27',
    cqzone: '14',
    gridsquare: 'JO21NS',
    iota: null,
    pota: null,
    sota: null,
    wwff: null,
    lic_class: 'Full',
    lic_efdate: null,
    lic_expdate: null,
    lotw: null,
    eqsl: null,
    mqsl: null,
    qslinfo: null,
    image: null,
    views: 123,
    created: '2024-01-01 00:00:00',
    updated: '2026-05-01 12:00:00'
  }
}

const NOT_FOUND_JSON = { error: 'Callsign not found: XX9XX9XX' }
const SOME_OTHER_ERROR_JSON = { error: 'Internal database error' }
const MISSING_DATA_JSON = { success: true, api: 'QRZCALL JSON API v1.0' }

describe('apiQRZCALL.castString', () => {
  it('returns empty string for null/undefined', () => {
    expect(castString(null)).toBe('')
    expect(castString(undefined)).toBe('')
  })
  it('coerces numbers to strings', () => {
    expect(castString(42)).toBe('42')
    expect(castString(0)).toBe('0')
  })
  it('returns strings unchanged', () => {
    expect(castString('hi')).toBe('hi')
    expect(castString('')).toBe('')
  })
})

describe('apiQRZCALL.castNumber', () => {
  it('returns null for null/undefined', () => {
    expect(castNumber(null)).toBeNull()
    expect(castNumber(undefined)).toBeNull()
  })
  it('returns null for non-numeric strings', () => {
    expect(castNumber('abc')).toBeNull()
  })
  it('parses numeric strings and numbers', () => {
    expect(castNumber('27')).toBe(27)
    expect(castNumber(14)).toBe(14)
    expect(castNumber('51.760403')).toBeCloseTo(51.760403)
    expect(castNumber(263)).toBe(263)
  })
})

describe('apiQRZCALL.parseQRZCALLJson — happy path', () => {
  const result = parseQRZCALLJson(PA4R_JSON, 'PA4R')

  it('returns no error', () => {
    expect(result.error).toBeUndefined()
  })

  it('returns the queried callsign', () => {
    expect(result.data.call).toBe('PA4R')
  })

  it('builds a full name with nickname in curly quotes', () => {
    expect(result.data.name).toContain('Ronald')
    expect(result.data.name).toContain('“Ron”')
    expect(result.data.name).toContain('DHer')
  })

  it('extracts grid square as-is', () => {
    expect(result.data.grid).toBe('JO21NS')
  })

  it('casts numeric fields to Numbers', () => {
    expect(result.data.dxccCode).toBe(263)
    expect(result.data.cqZone).toBe(14)
    expect(result.data.ituZone).toBe(27)
    expect(result.data.lat).toBeCloseTo(51.760403)
    expect(result.data.lon).toBeCloseTo(5.111732)
  })

  it('coerces missing text fields to empty strings (not undefined/null)', () => {
    expect(result.data.county).toBe('')
    expect(result.data.image).toBe('')
    expect(result.data.tz).toBe('')
  })

  it('puts the queried callsign into allCalls', () => {
    expect(result.data.allCalls).toContain('PA4R')
  })

  it('returns an empty imageInfo array (PoLo contract)', () => {
    expect(result.data.imageInfo).toEqual([])
  })
})

describe('apiQRZCALL.parseQRZCALLJson — error paths', () => {
  it('returns "<call> not found" on a 404-style error', () => {
    const result = parseQRZCALLJson(NOT_FOUND_JSON, 'XX9XX9XX')
    expect(result.error).toBe('XX9XX9XX not found')
    expect(result.data).toBeUndefined()
  })

  it('returns the raw error message for other server errors', () => {
    const result = parseQRZCALLJson(SOME_OTHER_ERROR_JSON, 'PA4R')
    expect(result.error).toBe('Internal database error')
    expect(result.data).toBeUndefined()
  })

  it('returns a friendly error if no data object is present', () => {
    const result = parseQRZCALLJson(MISSING_DATA_JSON, 'PA4R')
    expect(result.error).toMatch(/missing data object/)
    expect(result.data).toBeUndefined()
  })

  it('case-insensitive "not found" matching', () => {
    const result = parseQRZCALLJson({ error: 'NOT FOUND: ZZ9ZZ' }, 'ZZ9ZZ')
    expect(result.error).toBe('ZZ9ZZ not found')
  })
})
