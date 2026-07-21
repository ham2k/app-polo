// Copyright ©️ 2026 Jeff Kowalski <jeff.kowalski@gmail.com>
// SPDX-License-Identifier: MPL-2.0

import { buildSuggestedQSO, parseRefs } from './deepLinkTools'

jest.mock('../extensions/registry', () => ({
  findHooks: (category, { key } = {}) => {
    if (category !== 'activity') return []
    const hooks = [
      { key: 'sota', activationType: 'sotaActivation', huntingType: 'sota' },
      { key: 'pota', activationType: 'potaActivation', huntingType: 'pota' },
      { key: 'wwff', activationType: 'wwffActivation', huntingType: 'wwff' },
      { key: 'gma', activationType: 'gmaActivation', huntingType: 'gma' },
      { key: 'wca', activationType: 'wcaActivation', huntingType: 'wca' },
      { key: 'zlota', activationType: 'zlotaActivation', huntingType: 'zlota' }
    ]
    return key ? hooks.filter(h => h.key === key) : hooks
  }
}))

jest.mock('@ham2k/lib-operation-data', () => ({
  bandForFrequency: (freq) => {
    if (freq >= 14000 && freq < 14350) return '20m'
    if (freq >= 7000 && freq < 7300) return '40m'
    return undefined
  },
  modeForFrequency: (freq) => (freq < 14100 ? 'CW' : 'SSB')
}))

describe('buildSuggestedQSO', () => {
  it('parses a QSO with their.refs and Hz frequency', () => {
    const qso = buildSuggestedQSO(
      { 'their.call': 'k6test', 'their.refs': 'sota:W6/CT-006', frequency: '14285000', mode: 'cw' },
      'com.ham2k://qso'
    )
    expect(qso.their.call).toBe('K6TEST')
    expect(qso.freq).toBe(14285)
    expect(qso.band).toBe('20m')
    expect(qso.mode).toBe('CW')
    expect(qso.refs).toEqual([{ type: 'sota', ref: 'W6/CT-006' }])
  })

  it('accepts freq in kHz when frequency (Hz) is absent', () => {
    const qso = buildSuggestedQSO({ freq: '7185', 'their.call': 'ki2d' }, 'url')
    expect(qso.freq).toBe(7185)
    expect(qso.band).toBe('40m')
  })

  it('leaves mode undefined when omitted (no crash)', () => {
    const qso = buildSuggestedQSO({ 'their.call': 'ki2d' }, 'url')
    expect(qso.mode).toBeUndefined()
  })

  it('skips unknown ref types (lenient)', () => {
    const qso = buildSuggestedQSO({ 'their.refs': 'iota:NA-001,pota:US-1234' }, 'url')
    expect(qso.refs).toEqual([{ type: 'pota', ref: 'US-1234' }])
  })

  it('uppercases their.call, preserving a portable suffix and a multi-op list', () => {
    const qso = buildSuggestedQSO({ 'their.call': 'ki2d,s5/kc6x/p' }, 'url')
    expect(qso.their.call).toBe('KI2D,S5/KC6X/P')
  })

  it('ignores our.call (not read; the operation supplies our station)', () => {
    const qso = buildSuggestedQSO({ 'our.call': 'kc6x', 'their.call': 'ki2d' }, 'url')
    expect(qso.our).toBeUndefined()
  })

  it('does not place our.refs on the QSO', () => {
    const qso = buildSuggestedQSO({ 'our.refs': 'sota:W6/CT-006' }, 'url')
    expect(qso.refs).toBeUndefined()
  })

  describe('multiple references (n-fer activations)', () => {
    it('maps multiple their.refs across programs (park + summit) onto the QSO', () => {
      const qso = buildSuggestedQSO({ 'their.refs': 'pota:US-1234,sota:W6/CT-006' }, 'url')
      expect(qso.refs).toEqual([
        { type: 'pota', ref: 'US-1234' },
        { type: 'sota', ref: 'W6/CT-006' }
      ])
    })

    it('keeps several parks of the same program for an n-fer chase', () => {
      const qso = buildSuggestedQSO({ 'their.refs': 'pota:US-1234,pota:US-5678' }, 'url')
      expect(qso.refs).toEqual([
        { type: 'pota', ref: 'US-1234' },
        { type: 'pota', ref: 'US-5678' }
      ])
    })

    it('keeps only the valid refs when an n-fer list mixes known and unknown types', () => {
      const qso = buildSuggestedQSO({ 'their.refs': 'pota:US-1234,iota:NA-001,sota:W6/CT-006' }, 'url')
      expect(qso.refs).toEqual([
        { type: 'pota', ref: 'US-1234' },
        { type: 'sota', ref: 'W6/CT-006' }
      ])
    })
  })
})

describe('parseRefs', () => {
  it('parses a comma-separated type:ref list', () => {
    expect(parseRefs('pota:US-1234,sota:W6/CT-006')).toEqual([
      { type: 'pota', ref: 'US-1234' },
      { type: 'sota', ref: 'W6/CT-006' }
    ])
  })

  it('skips unknown types and malformed parts', () => {
    expect(parseRefs('iota:NA-001,pota:US-1234,nonsense,:x,pota:')).toEqual([
      { type: 'pota', ref: 'US-1234' }
    ])
  })

  it('returns undefined for empty or all-invalid input', () => {
    expect(parseRefs('')).toBeUndefined()
    expect(parseRefs(undefined)).toBeUndefined()
    expect(parseRefs('iota:NA-001')).toBeUndefined()
  })
})
