/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { XMLParser } from 'fast-xml-parser'
import { parseQRZCALLXml, castString, castNumber } from './parseQRZCALLXml'

// Real response shape returned by api.qrzcall.eu/v1/pub/callsign_xml.php
// captured from production for callsign PA4R.
const PA4R_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QRZCALLDatabase version="1.0">
  <Callsign>
    <call>PA4R</call>
    <fname>Ronald</fname>
    <name>DHer</name>
    <nickname>Ron</nickname>
    <born>1965</born>
    <addr1>address 1</addr1>
    <addr2>Wijk en Aalburg</addr2>
    <zip>4261</zip>
    <state>NB</state>
    <country>Netherlands</country>
    <dxcc>263</dxcc>
    <land>Netherlands</land>
    <continent>EU</continent>
    <lat>51.760403</lat>
    <lon>5.111732</lon>
    <ituzone>27</ituzone>
    <cqzone>14</cqzone>
    <grid>JO21NS</grid>
    <iota></iota>
    <class>Full</class>
    <email></email>
    <url></url>
    <views>123</views>
  </Callsign>
</QRZCALLDatabase>`

const NOT_FOUND_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QRZCALLDatabase version="1.0"><Error>Callsign not found: XX9XX9XX</Error><code>404</code></QRZCALLDatabase>`

const SOME_OTHER_ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QRZCALLDatabase version="1.0"><Error>Internal database error</Error></QRZCALLDatabase>`

const EMPTY_DOC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<QRZCALLDatabase version="1.0"></QRZCALLDatabase>`

const parser = new XMLParser()

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
  })
})

describe('apiQRZCALL.parseQRZCALLXml — happy path', () => {
  const xml = parser.parse(PA4R_XML)
  const result = parseQRZCALLXml(xml, 'PA4R')

  it('returns no error', () => {
    expect(result.error).toBeUndefined()
  })

  it('returns the queried callsign', () => {
    expect(result.data.call).toBe('PA4R')
  })

  it('builds a full name with nickname in curly quotes', () => {
    // capitalizeString preserves user-set casing when force: false. Our fixture
    // has "Ronald", "Ron", "DHer" — the formatter should keep them as-is and
    // wrap the nickname.
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

describe('apiQRZCALL.parseQRZCALLXml — error paths', () => {
  it('returns "<call> not found" on a 404-style error tag', () => {
    const xml = parser.parse(NOT_FOUND_XML)
    const result = parseQRZCALLXml(xml, 'XX9XX9XX')
    expect(result.error).toBe('XX9XX9XX not found')
    expect(result.data).toBeUndefined()
  })

  it('returns the raw error message for other server errors', () => {
    const xml = parser.parse(SOME_OTHER_ERROR_XML)
    const result = parseQRZCALLXml(xml, 'PA4R')
    expect(result.error).toBe('Internal database error')
    expect(result.data).toBeUndefined()
  })

  it('returns a friendly error if no <Callsign> element is present', () => {
    const xml = parser.parse(EMPTY_DOC_XML)
    const result = parseQRZCALLXml(xml, 'PA4R')
    expect(result.error).toMatch(/missing <Callsign>/)
    expect(result.data).toBeUndefined()
  })

  it('case-insensitive "not found" matching', () => {
    const upperCaseError = `<?xml version="1.0" encoding="UTF-8"?>
      <QRZCALLDatabase version="1.0"><Error>NOT FOUND: ZZ9ZZ</Error></QRZCALLDatabase>`
    const xml = parser.parse(upperCaseError)
    const result = parseQRZCALLXml(xml, 'ZZ9ZZ')
    expect(result.error).toBe('ZZ9ZZ not found')
  })
})
