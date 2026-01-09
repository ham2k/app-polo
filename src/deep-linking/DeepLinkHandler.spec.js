/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// Mock @ham2k/lib-operation-data before importing DeepLinkUtils
jest.mock('@ham2k/lib-operation-data', () => ({
  bandForFrequency: (freq) => {
    if (freq >= 14000000 && freq < 14350000) return '20m'
    if (freq >= 7000000 && freq < 7300000) return '40m'
    if (freq >= 21000000 && freq < 21450000) return '15m'
    return undefined
  },
  modeForFrequency: (freq) => {
    // Simplified: CW below 14100, SSB above
    if (freq >= 14000000 && freq < 14100000) return 'CW'
    if (freq >= 14100000 && freq < 14350000) return 'SSB'
    if (freq >= 7000000 && freq < 7050000) return 'CW'
    if (freq >= 7050000 && freq < 7300000) return 'SSB'
    return 'SSB'
  }
}))

import { parseDeepLinkURL, buildSuggestedQSO, TYPE_TO_ACTIVATION } from './DeepLinkUtils'

describe('DeepLinkHandler', () => {
  describe('TYPE_TO_ACTIVATION', () => {
    it('should have all expected activation types', () => {
      expect(TYPE_TO_ACTIVATION).toEqual({
        sota: 'sotaActivation',
        pota: 'potaActivation',
        wwff: 'wwffActivation',
        gma: 'gmaActivation',
        wca: 'wcaActivation',
        zlota: 'zlotaActivation'
      })
    })
  })

  describe('parseDeepLinkURL', () => {
    describe('valid URLs', () => {
      it('parses chase-only URL with theirRef/theirSig', () => {
        const url = 'com.ham2k.polo://qso?theirCall=K6TEST&theirRef=W6/CT-006&theirSig=sota&freq=14285000&mode=CW'
        const result = parseDeepLinkURL(url)
        expect(result).toEqual({
          myRef: undefined,
          mySig: undefined,
          theirRef: 'W6/CT-006',
          theirSig: 'sota',
          theirCall: 'K6TEST',
          freq: 14285000,
          mode: 'CW',
          time: undefined,
          myCall: undefined
        })
      })

      it('parses spot URL with myRef/mySig', () => {
        const url = 'com.ham2k.polo://qso?myRef=W6/CT-006&mySig=sota&freq=14285000&mode=CW'
        const result = parseDeepLinkURL(url)
        expect(result.myRef).toBe('W6/CT-006')
        expect(result.mySig).toBe('sota')
        expect(result.theirRef).toBeUndefined()
        expect(result.theirSig).toBeUndefined()
        expect(result.freq).toBe(14285000)
        expect(result.mode).toBe('CW')
      })

      it('parses S2S URL with both ref sets', () => {
        const url = 'com.ham2k.polo://qso?myRef=K-1234&mySig=pota&theirRef=W6/CT-006&theirSig=sota&theirCall=K6TEST'
        const result = parseDeepLinkURL(url)
        expect(result.myRef).toBe('K-1234')
        expect(result.mySig).toBe('pota')
        expect(result.theirRef).toBe('W6/CT-006')
        expect(result.theirSig).toBe('sota')
        expect(result.theirCall).toBe('K6TEST')
      })

      it('parses URL with all parameters', () => {
        const url = 'com.ham2k.polo://qso?myRef=K-1234&mySig=pota&theirRef=W6/CT-006&theirSig=sota&freq=14285000&mode=CW&time=1704067200000&myCall=N0CALL&theirCall=K6TEST'
        const result = parseDeepLinkURL(url)
        expect(result).toEqual({
          myRef: 'K-1234',
          mySig: 'pota',
          theirRef: 'W6/CT-006',
          theirSig: 'sota',
          freq: 14285000,
          mode: 'CW',
          time: 1704067200000,
          myCall: 'N0CALL',
          theirCall: 'K6TEST'
        })
      })
    })

    describe('supported types', () => {
      it.each(['sota', 'pota', 'wwff', 'gma', 'wca', 'zlota'])('accepts %s as mySig', (sig) => {
        const url = `com.ham2k.polo://qso?myRef=TEST-123&mySig=${sig}`
        expect(parseDeepLinkURL(url)).not.toBeNull()
        expect(parseDeepLinkURL(url).mySig).toBe(sig)
      })

      it.each(['sota', 'pota', 'wwff', 'gma', 'wca', 'zlota'])('accepts %s as theirSig', (sig) => {
        const url = `com.ham2k.polo://qso?theirRef=TEST-123&theirSig=${sig}`
        expect(parseDeepLinkURL(url)).not.toBeNull()
        expect(parseDeepLinkURL(url).theirSig).toBe(sig)
      })
    })

    describe('invalid URLs', () => {
      it('returns null for URL with no refs', () => {
        const url = 'com.ham2k.polo://qso?freq=14285000&mode=CW'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for unknown mySig', () => {
        const url = 'com.ham2k.polo://qso?myRef=TEST&mySig=unknown'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      // IOTA not yet supported in Polo - change to valid test when iotaActivation is added
      it('returns null for iota theirSig (not yet supported)', () => {
        const url = 'com.ham2k.polo://qso?theirRef=TEST&theirSig=iota'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for incomplete myRef pair (myRef without mySig)', () => {
        const url = 'com.ham2k.polo://qso?myRef=W6/CT-006'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for incomplete myRef pair (mySig without myRef)', () => {
        const url = 'com.ham2k.polo://qso?mySig=sota'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for incomplete theirRef pair (theirRef without theirSig)', () => {
        const url = 'com.ham2k.polo://qso?theirRef=W6/CT-006'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for incomplete theirRef pair (theirSig without theirRef)', () => {
        const url = 'com.ham2k.polo://qso?theirSig=sota'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for wrong URL scheme', () => {
        const url = 'https://example.com/qso?myRef=TEST&mySig=sota'
        expect(parseDeepLinkURL(url)).toBeNull()
      })

      it('returns null for URL without query string', () => {
        const url = 'com.ham2k.polo://qso'
        expect(parseDeepLinkURL(url)).toBeNull()
      })
    })

    describe('case normalization', () => {
      it('normalizes mySig to lowercase', () => {
        const url = 'com.ham2k.polo://qso?myRef=TEST&mySig=SOTA'
        expect(parseDeepLinkURL(url).mySig).toBe('sota')
      })

      it('normalizes theirSig to lowercase', () => {
        const url = 'com.ham2k.polo://qso?theirRef=TEST&theirSig=POTA'
        expect(parseDeepLinkURL(url).theirSig).toBe('pota')
      })

      it('normalizes mode to uppercase', () => {
        const url = 'com.ham2k.polo://qso?theirRef=TEST&theirSig=sota&mode=cw'
        expect(parseDeepLinkURL(url).mode).toBe('CW')
      })

      it('normalizes callsigns to uppercase', () => {
        const url = 'com.ham2k.polo://qso?theirRef=TEST&theirSig=sota&theirCall=k6test&myCall=n0call'
        const result = parseDeepLinkURL(url)
        expect(result.theirCall).toBe('K6TEST')
        expect(result.myCall).toBe('N0CALL')
      })

      it('preserves myRef case', () => {
        const url = 'com.ham2k.polo://qso?myRef=W6/CT-006&mySig=sota'
        expect(parseDeepLinkURL(url).myRef).toBe('W6/CT-006')
      })

      it('preserves theirRef case', () => {
        const url = 'com.ham2k.polo://qso?theirRef=W6/CT-006&theirSig=sota'
        expect(parseDeepLinkURL(url).theirRef).toBe('W6/CT-006')
      })
    })
  })

  describe('buildSuggestedQSO', () => {
    it('builds QSO with their ref from theirRef/theirSig', () => {
      const params = { theirRef: 'W6/CT-006', theirSig: 'sota', theirCall: 'K6TEST' }
      const qso = buildSuggestedQSO(params)
      expect(qso.refs).toEqual([{ type: 'sotaActivation', ref: 'W6/CT-006' }])
      expect(qso.their.call).toBe('K6TEST')
    })

    it('maps all theirSig values to correct activation types', () => {
      const testCases = [
        { sig: 'sota', expected: 'sotaActivation' },
        { sig: 'pota', expected: 'potaActivation' },
        { sig: 'wwff', expected: 'wwffActivation' },
        { sig: 'gma', expected: 'gmaActivation' },
        { sig: 'wca', expected: 'wcaActivation' },
        { sig: 'zlota', expected: 'zlotaActivation' }
      ]

      testCases.forEach(({ sig, expected }) => {
        const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: sig })
        expect(qso.refs).toEqual([{ type: expected, ref: 'TEST' }])
      })
    })

    it('does not add refs when theirRef/theirSig not provided', () => {
      const params = { freq: 14285000, mode: 'CW' }
      const qso = buildSuggestedQSO(params)
      expect(qso.refs).toBeUndefined()
    })

    it('includes their callsign', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', theirCall: 'K6TEST' })
      expect(qso.their.call).toBe('K6TEST')
    })

    it('includes our callsign', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', myCall: 'N0CALL' })
      expect(qso.our.call).toBe('N0CALL')
    })

    it('includes frequency and derives band', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', freq: 14285000 })
      expect(qso.freq).toBe(14285000)
      expect(qso.band).toBe('20m')
    })

    it('derives mode from frequency when not provided', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', freq: 14285000 })
      expect(qso.mode).toBe('SSB')
    })

    it('derives CW mode for CW portion of band', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', freq: 14035000 })
      expect(qso.mode).toBe('CW')
    })

    it('uses provided mode over derived mode', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', freq: 14285000, mode: 'CW' })
      expect(qso.mode).toBe('CW')
    })

    it('includes timestamp', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota', time: 1704067200000 })
      expect(qso.startAtMillis).toBe(1704067200000)
    })

    it('includes _suggestedKey with deeplink prefix and timestamp', () => {
      const before = Date.now()
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota' })
      const after = Date.now()
      expect(qso._suggestedKey).toMatch(/^deeplink-\d+$/)
      // Extract timestamp from key and verify it's in expected range
      const timestamp = parseInt(qso._suggestedKey.split('-')[1], 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('initializes empty their and our objects', () => {
      const qso = buildSuggestedQSO({ theirRef: 'TEST', theirSig: 'sota' })
      expect(qso.their).toBeDefined()
      expect(qso.our).toBeDefined()
    })
  })
})
