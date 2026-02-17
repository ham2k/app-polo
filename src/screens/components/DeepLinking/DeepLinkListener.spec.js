/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025-2026 Jeff Kowalski <jeff.KC6X@gmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

jest.mock('../../../extensions/registry', () => ({
  findHooks: (category) => {
    if (category === 'activity') {
      return [
        { key: 'sota', activationType: 'sotaActivation', huntingType: 'sota' },
        { key: 'pota', activationType: 'potaActivation', huntingType: 'pota' },
        { key: 'wwff', activationType: 'wwffActivation', huntingType: 'wwff' },
        { key: 'gma', activationType: 'gmaActivation', huntingType: 'gma' },
        { key: 'wca', activationType: 'wcaActivation', huntingType: 'wca' },
        { key: 'zlota', activationType: 'zlotaActivation', huntingType: 'zlota' }
      ]
    }
    return []
  }
}))

// Mock @ham2k/lib-operation-data before importing DeepLinkUtils
// Note: These use kHz values since parseFrequency now converts Hz to kHz
jest.mock('@ham2k/lib-operation-data', () => ({
  bandForFrequency: (freq) => {
    if (freq >= 14000 && freq < 14350) return '20m'
    if (freq >= 7000 && freq < 7300) return '40m'
    if (freq >= 21000 && freq < 21450) return '15m'
    return undefined
  },
  modeForFrequency: (freq) => {
    // Simplified: CW below 14100, SSB above
    if (freq >= 14000 && freq < 14100) return 'CW'
    if (freq >= 14100 && freq < 14350) return 'SSB'
    if (freq >= 7000 && freq < 7050) return 'CW'
    if (freq >= 7050 && freq < 7300) return 'SSB'
    return 'SSB'
  }
}))

import { parseDeepLinkURL, buildSuggestedQSO } from './DeepLinkUtils'

describe('DeepLinkListener', () => {
  describe('parseDeepLinkURL', () => {
    describe('valid URLs', () => {
      it('parses chase-only URL with their.refs', () => {
        const url = 'com.ham2k.polo://qso?their.call=K6TEST&their.refs=sota:W6/CT-006&frequency=14285000&mode=CW'
        const result = parseDeepLinkURL(url)
        expect(result).toEqual({
          ourRefs: undefined,
          theirRefs: [{ type: 'sota', ref: 'W6/CT-006' }],
          theirCall: 'K6TEST',
          freq: 14285, // Hz input (14285000) converted to kHz
          mode: 'CW',
          startAtMillis: undefined,
          ourCall: undefined,
          returnpath: undefined
        })
      })

      it('parses activation URL with our.refs', () => {
        const url = 'com.ham2k.polo://qso?our.refs=sota:W6/CT-006&frequency=14285000&mode=CW'
        const result = parseDeepLinkURL(url)
        expect(result.ourRefs).toEqual([{ type: 'sota', ref: 'W6/CT-006' }])
        expect(result.theirRefs).toBeUndefined()
        expect(result.freq).toBe(14285) // Hz input converted to kHz
        expect(result.mode).toBe('CW')
      })

      it('parses S2S URL with both ref sets', () => {
        const url = 'com.ham2k.polo://qso?our.refs=pota:K-1234&their.refs=sota:W6/CT-006&their.call=K6TEST'
        const result = parseDeepLinkURL(url)
        expect(result.ourRefs).toEqual([{ type: 'pota', ref: 'K-1234' }])
        expect(result.theirRefs).toEqual([{ type: 'sota', ref: 'W6/CT-006' }])
        expect(result.theirCall).toBe('K6TEST')
      })

      it('parses URL with multiple our.refs', () => {
        const url = 'com.ham2k.polo://qso?our.refs=pota:K-1234,sota:W6/CT-006&frequency=14285000'
        const result = parseDeepLinkURL(url)
        expect(result.ourRefs).toEqual([
          { type: 'pota', ref: 'K-1234' },
          { type: 'sota', ref: 'W6/CT-006' }
        ])
      })

      it('parses URL with multiple their.refs', () => {
        const url = 'com.ham2k.polo://qso?their.refs=pota:K-1234,sota:W6/CT-006'
        const result = parseDeepLinkURL(url)
        expect(result.theirRefs).toEqual([
          { type: 'pota', ref: 'K-1234' },
          { type: 'sota', ref: 'W6/CT-006' }
        ])
      })

      it('parses URL with all parameters', () => {
        const url = 'com.ham2k.polo://qso?our.refs=pota:K-1234&their.refs=sota:W6/CT-006&frequency=14285000&mode=CW&startAtMillis=1704067200000&our.call=N0CALL&their.call=K6TEST'
        const result = parseDeepLinkURL(url)
        expect(result).toEqual({
          ourRefs: [{ type: 'pota', ref: 'K-1234' }],
          theirRefs: [{ type: 'sota', ref: 'W6/CT-006' }],
          freq: 14285, // Hz input (14285000) converted to kHz
          mode: 'CW',
          startAtMillis: 1704067200000,
          ourCall: 'N0CALL',
          theirCall: 'K6TEST',
          returnpath: undefined
        })
      })
    })

    describe('supported types', () => {
      it.each(['sota', 'pota', 'wwff', 'gma', 'wca', 'zlota'])('accepts %s in our.refs', (key) => {
        const url = `com.ham2k.polo://qso?our.refs=${key}:TEST-123`
        const result = parseDeepLinkURL(url)
        expect(result).not.toBeNull()
        expect(result.ourRefs[0].type).toBe(key)
      })

      it.each(['sota', 'pota', 'wwff', 'gma', 'wca', 'zlota'])('accepts %s in their.refs', (key) => {
        const url = `com.ham2k.polo://qso?their.refs=${key}:TEST-123`
        const result = parseDeepLinkURL(url)
        expect(result).not.toBeNull()
        expect(result.theirRefs[0].type).toBe(key)
      })
    })

    describe('invalid URLs', () => {
      it('returns null for URL with no refs', () => {
        const url = 'com.ham2k.polo://qso?frequency=14285000&mode=CW'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for unknown type in our.refs', () => {
        const url = 'com.ham2k.polo://qso?our.refs=unknown:TEST'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      // IOTA not yet supported in Polo - change to valid test when iotaActivation is added
      it('returns null for iota type (not yet supported)', () => {
        const url = 'com.ham2k.polo://qso?their.refs=iota:TEST'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for refs without colon separator', () => {
        const url = 'com.ham2k.polo://qso?our.refs=sotaTEST'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for refs with empty ref value', () => {
        const url = 'com.ham2k.polo://qso?our.refs=sota:'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for wrong URL scheme', () => {
        const url = 'https://example.com/qso?our.refs=sota:TEST'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for URL without query string', () => {
        const url = 'com.ham2k.polo://qso'
        expect(parseDeepLinkURL(url)).toBeNull()
      })
    })

    describe('case normalization', () => {
      it('normalizes ref type to lowercase', () => {
        const url = 'com.ham2k.polo://qso?our.refs=SOTA:TEST'
        expect(parseDeepLinkURL(url).ourRefs[0].type).toBe('sota')
      })

      it('normalizes mode to uppercase', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:TEST&mode=cw'
        expect(parseDeepLinkURL(url).mode).toBe('CW')
      })

      it('normalizes callsigns to uppercase', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:TEST&their.call=k6test&our.call=n0call'
        const result = parseDeepLinkURL(url)
        expect(result.theirCall).toBe('K6TEST')
        expect(result.ourCall).toBe('N0CALL')
      })

      it('preserves ref case', () => {
        const url = 'com.ham2k.polo://qso?our.refs=sota:W6/CT-006'
        expect(parseDeepLinkURL(url).ourRefs[0].ref).toBe('W6/CT-006')
      })
    })

    describe('returnpath handling', () => {
      it('parses returnpath from URL', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&returnpath=http%3A%2F%2Fsotacat.local%2F'
        const result = parseDeepLinkURL(url)
        expect(result.returnpath).toBe('http://sotacat.local')
      })

      it('parses returnpath with port', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&returnpath=http%3A%2F%2F192.168.4.1%3A8080%2F'
        const result = parseDeepLinkURL(url)
        expect(result.returnpath).toBe('http://192.168.4.1:8080')
      })

      it('strips trailing path from returnpath', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&returnpath=http%3A%2F%2Fsotacat.local%2Fsome%2Fpath'
        const result = parseDeepLinkURL(url)
        expect(result.returnpath).toBe('http://sotacat.local')
      })

      it('returns undefined for returnpath without protocol', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&returnpath=sotacat.local'
        const result = parseDeepLinkURL(url)
        expect(result.returnpath).toBeUndefined()
      })

      it('returns undefined for missing returnpath', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006'
        const result = parseDeepLinkURL(url)
        expect(result.returnpath).toBeUndefined()
      })

      it('returns undefined for empty returnpath', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&returnpath='
        const result = parseDeepLinkURL(url)
        expect(result.returnpath).toBeUndefined()
      })
    })

    describe('frequency handling', () => {
      it('converts Hz input to kHz for internal storage', () => {
        // SOTAcat sends 7245000 Hz (7.245 MHz on 40m)
        const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&frequency=7245000'
        const result = parseDeepLinkURL(url)
        expect(result.freq).toBe(7245) // 7245000 Hz → 7245 kHz
      })

      it('handles missing frequency gracefully', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:TEST'
        const result = parseDeepLinkURL(url)
        expect(result.freq).toBeUndefined()
      })

      it('handles invalid frequency string', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:TEST&frequency=abc'
        const result = parseDeepLinkURL(url)
        expect(result.freq).toBeUndefined()
      })

      it('handles empty frequency string', () => {
        const url = 'com.ham2k.polo://qso?their.refs=sota:TEST&frequency='
        const result = parseDeepLinkURL(url)
        expect(result.freq).toBeUndefined()
      })
    })
  })

  describe('frequency conversion for ADIF export', () => {
    it('converts Hz input to kHz internally for correct ADIF export', () => {
      // SOTAcat sends 7245000 Hz (7.245 MHz on 40m)
      const url = 'com.ham2k.polo://qso?their.refs=sota:W6/CT-006&frequency=7245000'
      const parsed = parseDeepLinkURL(url)

      // Internal storage should be in kHz
      expect(parsed.freq).toBe(7245)

      // ADIF export divides by 1000, so 7245 kHz / 1000 = 7.245 MHz
      const adifFreq = (parsed.freq / 1000).toFixed(6)
      expect(adifFreq).toBe('7.245000')
    })

    it('derives correct band from kHz frequency', () => {
      const qso = buildSuggestedQSO({
        theirRefs: [{ type: 'sota', ref: 'TEST' }],
        freq: 7245 // kHz (after parseFrequency conversion)
      })
      expect(qso.band).toBe('40m')
    })
  })

  describe('buildSuggestedQSO', () => {
    it('builds QSO with their refs using hunting type', () => {
      const params = { theirRefs: [{ type: 'sota', ref: 'W6/CT-006' }], theirCall: 'K6TEST' }
      const qso = buildSuggestedQSO(params)
      // theirRefs should use hunting type (e.g., 'sota') not activation type (e.g., 'sotaActivation')
      expect(qso.refs).toEqual([{ type: 'sota', ref: 'W6/CT-006' }])
      expect(qso.their.call).toBe('K6TEST')
    })

    it('builds QSO with multiple their refs', () => {
      const params = {
        theirRefs: [
          { type: 'pota', ref: 'K-1234' },
          { type: 'sota', ref: 'W6/CT-006' }
        ]
      }
      const qso = buildSuggestedQSO(params)
      expect(qso.refs).toEqual([
        { type: 'pota', ref: 'K-1234' },
        { type: 'sota', ref: 'W6/CT-006' }
      ])
    })

    it('maps all ref types to correct hunting types', () => {
      const testCases = [
        { type: 'sota', expected: 'sota' },
        { type: 'pota', expected: 'pota' },
        { type: 'wwff', expected: 'wwff' },
        { type: 'gma', expected: 'gma' },
        { type: 'wca', expected: 'wca' },
        { type: 'zlota', expected: 'zlota' }
      ]

      testCases.forEach(({ type, expected }) => {
        const qso = buildSuggestedQSO({ theirRefs: [{ type, ref: 'TEST' }] })
        expect(qso.refs).toEqual([{ type: expected, ref: 'TEST' }])
      })
    })

    it('does not add refs when theirRefs not provided', () => {
      const params = { freq: 14285, mode: 'CW' } // kHz (after Hz→kHz conversion)
      const qso = buildSuggestedQSO(params)
      expect(qso.refs).toBeUndefined()
    })

    it('includes their callsign', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], theirCall: 'K6TEST' })
      expect(qso.their.call).toBe('K6TEST')
    })

    it('includes our callsign', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], ourCall: 'N0CALL' })
      expect(qso.our.call).toBe('N0CALL')
    })

    it('includes frequency and derives band', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], freq: 14285 }) // kHz
      expect(qso.freq).toBe(14285)
      expect(qso.band).toBe('20m')
    })

    it('derives mode from frequency when not provided', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], freq: 14285 }) // kHz
      expect(qso.mode).toBe('SSB')
    })

    it('derives CW mode for CW portion of band', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], freq: 14035 }) // kHz
      expect(qso.mode).toBe('CW')
    })

    it('uses provided mode over derived mode', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], freq: 14285, mode: 'CW' }) // kHz
      expect(qso.mode).toBe('CW')
    })

    it('includes timestamp', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }], startAtMillis: 1704067200000 })
      expect(qso.startAtMillis).toBe(1704067200000)
    })

    it('includes _suggestedKey with deeplink prefix and timestamp', () => {
      const before = Date.now()
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }] })
      const after = Date.now()
      expect(qso._suggestedKey).toMatch(/^deeplink-\d+$/)
      // Extract timestamp from key and verify it's in expected range
      const timestamp = parseInt(qso._suggestedKey.split('-')[1], 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('initializes empty their and our objects', () => {
      const qso = buildSuggestedQSO({ theirRefs: [{ type: 'sota', ref: 'TEST' }] })
      expect(qso.their).toBeDefined()
      expect(qso.our).toBeDefined()
    })
  })
})
