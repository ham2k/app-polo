/*
 * Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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

import { qsonToADIF } from './qsonToADIF'

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
})
