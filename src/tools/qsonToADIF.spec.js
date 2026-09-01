// Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
// SPDX-License-Identifier: MPL-2.0

import { qsonToADIF } from './qsonToADIF'

jest.mock('../extensions/registry', () => ({
  findBestHook: () => null
}))

jest.mock('../store/settings', () => ({
  selectExportSettings: ({ settings }, key, defaults) => settings?.exports?.[key] ?? defaults ?? {}
}))

jest.mock('../store/operations', () => ({
  basePartialTemplates: () => ({}),
  compileTemplateForOperation: () => () => '',
  extraDataForTemplates: () => ({}),
  templateContextForOneExport: ({ operation }) => ({ operation })
}))

jest.mock('@ham2k/lib-operation-data', () => ({
  adifModeAndSubmodeForMode: (mode) => [mode || 'SSB'],
  frequencyForBand: () => 14250000,
  modeForFrequency: () => 'SSB'
}))

const baseSettings = {
  operatorCall: 'K1OP',
  exports: {
    default: {
      privateData: true
    }
  }
}

function baseOperation () {
  return {
    stationCall: 'K1OP',
    refs: [{ type: 'pota', ref: 'US-1111' }],
    grid: 'FN31',
    state: 'CT'
  }
}

function baseQSO ({ uuid, call, startAtMillis }) {
  return {
    uuid,
    startAtMillis,
    band: '20m',
    mode: 'SSB',
    their: { call },
    our: {}
  }
}

function handlerWithContextFields () {
  return {
    key: 'test',
    adifFieldsForOneQSO: ({ operation, common }) => [
      { X_OP_REF: operation.refs?.[0]?.ref },
      { X_COMMON_REF: common.refs?.[0]?.ref },
      { X_COMMON_GRID: common.grid }
    ]
  }
}

describe('qsonToADIF segment context', () => {
  it('keeps original refs when combineSegmentRefs is false', () => {
    const adif = qsonToADIF({
      operation: baseOperation(),
      settings: baseSettings,
      qsos: [
        {
          uuid: 'start',
          startAtMillis: 1000,
          event: {
            event: 'start',
            note: 'segment start',
            operation: {
              refs: [{ type: 'pota', ref: 'US-2222' }],
              grid: 'FM18'
            }
          }
        },
        baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })
      ],
      handler: handlerWithContextFields(),
      format: 'adif',
      combineSegmentRefs: false
    })

    expect(adif).toMatch(/<X_OP_REF:\d+>US-1111/)
    expect(adif).toMatch(/<X_COMMON_REF:\d+>US-1111/)
    expect(adif).toMatch(/<X_COMMON_GRID:\d+>FM18/)
  })

  it('switches refs when combineSegmentRefs is true', () => {
    const adif = qsonToADIF({
      operation: baseOperation(),
      settings: baseSettings,
      qsos: [
        {
          uuid: 'start',
          startAtMillis: 1000,
          event: {
            event: 'start',
            note: 'segment start',
            operation: {
              refs: [{ type: 'pota', ref: 'US-2222' }],
              grid: 'FM18'
            }
          }
        },
        baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })
      ],
      handler: handlerWithContextFields(),
      format: 'adif',
      combineSegmentRefs: true
    })

    expect(adif).toMatch(/<X_OP_REF:\d+>US-2222/)
    expect(adif).toMatch(/<X_COMMON_REF:\d+>US-2222/)
    expect(adif).toMatch(/<X_COMMON_GRID:\d+>FM18/)
  })

  it('ignores deleted start or break events when updating section context', () => {
    const adif = qsonToADIF({
      operation: baseOperation(),
      settings: baseSettings,
      qsos: [
        {
          uuid: 'deleted-break',
          deleted: true,
          startAtMillis: 1000,
          event: {
            event: 'break',
            note: 'deleted segment break',
            operation: {
              refs: [{ type: 'pota', ref: 'US-3333' }],
              grid: 'EM12'
            }
          }
        },
        baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })
      ],
      handler: handlerWithContextFields(),
      format: 'adif',
      combineSegmentRefs: true
    })

    expect(adif).toMatch(/<X_OP_REF:\d+>US-1111/)
    expect(adif).toMatch(/<X_COMMON_REF:\d+>US-1111/)
    expect(adif).toMatch(/<X_COMMON_GRID:\d+>FN31/)
    expect(adif).not.toContain('US-3333')
    expect(adif).not.toContain('EM12')
  })

  it('updates attributes of an existing ref across segments, even when combineSegmentRefs is false', () => {
    // QSO Parties keep the same ref throughout the operation, but change the county we operate
    // from at each segment. Those changes belong in the log even for a ref-scoped export.
    const adif = qsonToADIF({
      operation: {
        stationCall: 'K1OP',
        refs: [{ type: 'qp', ref: 'co', location: 'ADA' }] // The operation carries the *latest* segment's refs
      },
      settings: baseSettings,
      qsos: [
        {
          uuid: 'start',
          startAtMillis: 1000,
          event: {
            event: 'start',
            note: 'segment start',
            operation: { refs: [{ type: 'qp', ref: 'co', location: 'DEL' }] }
          }
        },
        baseQSO({ uuid: 'q1', call: 'K1KK', startAtMillis: 2000 }),
        {
          uuid: 'break',
          startAtMillis: 3000,
          event: {
            event: 'break',
            note: 'segment break',
            operation: { refs: [{ type: 'qp', ref: 'co', location: 'ADA' }] }
          }
        },
        baseQSO({ uuid: 'q2', call: 'K2KK', startAtMillis: 4000 })
      ],
      handler: {
        key: 'qp',
        adifFieldsForOneQSO: ({ qso, operation }) => [
          { CALL: qso.their.call },
          { STX_STRING: operation.refs?.[0]?.location }
        ]
      },
      format: 'adif',
      combineSegmentRefs: false
    })

    expect(adif).toMatch(/<CALL:\d+>K1KK.*?<STX_STRING:\d+>DEL/s)
    expect(adif).toMatch(/<CALL:\d+>K2KK.*?<STX_STRING:\d+>ADA/s)
  })

  it('exports segment events that carry no note, message or description', () => {
    // Segment start/break events created by changing operation details have none of
    // these fields, and a crash here made every export of such an operation fail silently.
    const adif = qsonToADIF({
      operation: baseOperation(),
      settings: baseSettings,
      qsos: [
        {
          uuid: 'start',
          startAtMillis: 1000,
          event: {
            event: 'start',
            operation: { refs: [{ type: 'pota', ref: 'US-2222' }] }
          }
        },
        baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })
      ],
      handler: handlerWithContextFields(),
      format: 'adif',
      combineSegmentRefs: false
    })

    expect(adif).toMatch(/<APP_HAM2K_START:\d+>/)
    expect(adif).toMatch(/<CALL:\d+>K1AAA/)
  })
})

describe('qsonToADIF operator', () => {
  // OPERATOR must reflect who actually ran the station. Defaulting it to the station
  // call, or to the app's own callsign when operating a different station call, would
  // claim an operator the user never entered.
  it('omits OPERATOR when the operation has no operator', () => {
    const adif = qsonToADIF({
      operation: { ...baseOperation(), stationCall: 'W1CLUB' },
      settings: baseSettings,
      qsos: [baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })],
      handler: handlerWithContextFields(),
      format: 'adif'
    })

    expect(adif).toMatch(/<STATION_CALLSIGN:\d+>W1CLUB/)
    expect(adif).not.toMatch(/<OPERATOR:/)
  })

  it('omits OPERATOR when the station call is the app\'s own callsign', () => {
    const adif = qsonToADIF({
      operation: baseOperation(),
      settings: baseSettings,
      qsos: [baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })],
      handler: handlerWithContextFields(),
      format: 'adif'
    })

    expect(adif).toMatch(/<STATION_CALLSIGN:\d+>K1OP/)
    expect(adif).not.toMatch(/<OPERATOR:/)
  })

  it('exports a QSO\'s own operator ahead of the operation\'s', () => {
    const qso = baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })
    qso.our.operatorCall = 'K1GUEST'
    const adif = qsonToADIF({
      operation: { ...baseOperation(), stationCall: 'W1CLUB', local: { operatorCall: 'K1OP' } },
      settings: baseSettings,
      qsos: [qso],
      handler: handlerWithContextFields(),
      format: 'adif'
    })

    expect(adif).toMatch(/<OPERATOR:\d+>K1GUEST/)
  })

  it('exports the operation operator when one is set', () => {
    const adif = qsonToADIF({
      operation: { ...baseOperation(), stationCall: 'W1CLUB', local: { operatorCall: 'K1OP' } },
      settings: baseSettings,
      qsos: [baseQSO({ uuid: 'q1', call: 'K1AAA', startAtMillis: 2000 })],
      handler: handlerWithContextFields(),
      format: 'adif'
    })

    expect(adif).toMatch(/<OPERATOR:\d+>K1OP/)
  })
})
