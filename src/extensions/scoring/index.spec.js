// Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../registry', () => ({
  findBestHook: jest.fn(),
  findHooks: jest.fn(() => [])
}))

jest.mock('@ham2k/lib-operation-data', () => ({
  BANDS: ['20m']
}))

jest.mock('../../distro', () => ({
  reportError: jest.fn()
}))

const { analyzeAndSectionQSOs, buildHeaderSummary } = require('./index')

const DAY = 24 * 60 * 60 * 1000

function qso (uuid, startAtMillis) {
  return {
    uuid,
    startAtMillis,
    their: { call: uuid.toUpperCase() },
    band: '20m',
    mode: 'CW'
  }
}

function segmentEvent (uuid, startAtMillis, event = 'break') {
  return {
    uuid,
    startAtMillis,
    band: 'event',
    their: { call: uuid.toUpperCase() },
    event: {
      event,
      operation: { grid: uuid }
    }
  }
}

describe('analyzeAndSectionQSOs segment summaries', () => {
  test('builds header counts from qsos while scoring against operationQSOs', () => {
    const scoringForQSO = jest.fn(({ qsos }) => ({ operationQSOCount: qsos.length }))
    const accumulateScoreForOperation = jest.fn(({ qsoScore, score }) => ({
      operationQSOCounts: [...(score.operationQSOCounts ?? []), qsoScore.operationQSOCount]
    }))

    const summary = buildHeaderSummary({
      qsos: [qso('a', 2000)],
      operationQSOs: [
        segmentEvent('start-grid', 1000, 'start'),
        qso('a', 2000),
        qso('b', 3000)
      ],
      operation: {},
      scoringHandlers: [{
        ref: { type: 'test' },
        handler: {
          key: 'test',
          scoringForQSO,
          accumulateScoreForOperation
        }
      }]
    })

    expect(summary).toMatchInlineSnapshot(`
      {
        "count": 1,
        "scores": {
          "test": {
            "operationQSOCounts": [
              3,
            ],
          },
        },
      }
    `)
  })

  test('attaches segment QSO counts to start and break events', () => {
    const start = segmentEvent('start-grid', 1000, 'start')
    const brk = segmentEvent('break-grid', 4000, 'break')

    analyzeAndSectionQSOs({
      operation: {},
      qsos: [
        start,
        qso('a', 2000),
        qso('b', 3000),
        brk,
        qso('c', 5000)
      ]
    })

    expect([
      start.event.segmentSummary?.count,
      brk.event.segmentSummary?.count
    ]).toMatchInlineSnapshot(`
      [
        2,
        1,
      ]
    `)
  })

  test('carries segment summaries across day boundaries', () => {
    const brk = segmentEvent('break-grid', DAY - 1000, 'break')

    analyzeAndSectionQSOs({
      operation: {},
      qsos: [
        brk,
        qso('a', DAY + 1000),
        qso('b', DAY + 2000)
      ]
    })

    expect(brk.event.segmentSummary?.count).toBe(2)
  })
})
