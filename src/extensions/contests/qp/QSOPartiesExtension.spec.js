// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../../../ui/index.js', () => ({}))
jest.mock('../../../store/operations', () => ({ setOperationData: jest.fn() }))
jest.mock('./QSOPartiesActivityOptions', () => ({ ActivityOptions: () => null }))
jest.mock('./QSOPartiesSpotting', () => ({ QSOPartiesPostSelfSpot: jest.fn(), SpotsHook: jest.fn() }))

import { ReferenceHandler } from './QSOPartiesExtension'

const CO_REF = { type: 'qp', ref: 'CO', location: 'ADA' }

function simulateOperation ({ ref, qsoCount }) {
  const operation = {}
  const qsos = []
  let score

  for (let i = 0; i < qsoCount; i++) {
    const qso = {
      key: `qso-${i}`,
      band: '20m',
      mode: 'CW',
      their: { call: `K1AA${i}`, exchange: 'NY' },
      refs: [{ type: 'qp', location: 'NY' }]
    }
    const qsoScore = ReferenceHandler.scoringForQSO({ qso, qsos, operation, ref, score })
    score = ReferenceHandler.accumulateScoreForOperation({ qsoScore, score, operation, ref })
    qsos.push(qso)
  }

  return score
}

describe('QSO Party county activation bonus', () => {
  // Colorado awards 500 points per activated county, but only once a county
  // has at least 15 QSOs logged from it. Below the minimum, no bonus applies.
  it('awards the bonus once the per-county QSO minimum is reached', () => {
    const score = simulateOperation({ ref: CO_REF, qsoCount: 15 })
    expect(score.activatedCounties.ADA).toEqual(15)
    expect(score.bonusTotal).toEqual(500)
  })

  it('awards no bonus below the per-county QSO minimum', () => {
    const score = simulateOperation({ ref: CO_REF, qsoCount: 14 })
    expect(score.bonusTotal).toEqual(0)
  })

  it('does not treat an out-of-state location as an activated county', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'CO', location: 'NY' }, qsoCount: 15 })
    expect(score.activatedCounties).toEqual({})
    expect(score.bonusTotal).toEqual(0)
  })
})
