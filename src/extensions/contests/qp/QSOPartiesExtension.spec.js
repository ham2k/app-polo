// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../../../ui/index.js', () => ({}))
jest.mock('../../../store/operations', () => ({ setOperationData: jest.fn() }))
jest.mock('./QSOPartiesActivityOptions', () => ({ ActivityOptions: () => null }))
jest.mock('./QSOPartiesSpotting', () => ({ QSOPartiesPostSelfSpot: jest.fn(), SpotsHook: jest.fn() }))

import { QSO_PARTY_DATA, ReferenceHandler } from './QSOPartiesExtension'

const CO_REF = { type: 'qp', ref: 'CO', location: 'ADA', mobile: true }

function simulateOperation ({ ref, qsoCount, theirLocations = ['NY'], theirCalls }) {
  const operation = {}
  const qsos = []
  let score

  for (let i = 0; i < qsoCount; i++) {
    const theirLocation = theirLocations[i % theirLocations.length]
    const theirCall = theirCalls?.[i] ?? `K1AA${i}`
    const qso = {
      key: `qso-${i}`,
      band: '20m',
      mode: 'CW',
      their: { call: theirCall, baseCall: theirCall, exchange: theirLocation },
      refs: [{ type: 'qp', location: theirLocation }]
    }
    const qsoScore = ReferenceHandler.scoringForQSO({ qso, qsos, operation, ref, score })
    score = ReferenceHandler.accumulateScoreForOperation({ qsoScore, score, operation, ref })
    qsos.push(qso)
  }

  return score
}

describe('QSO Party county activation bonus', () => {
  // Colorado awards mobile & rover stations 500 points per activated county,
  // but only once a county has at least 15 QSOs logged from it. Below the
  // minimum, no bonus applies.
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
    const score = simulateOperation({ ref: { ...CO_REF, location: 'NY' }, qsoCount: 15 })
    expect(score.activatedCounties).toEqual({})
    expect(score.bonusTotal).toEqual(0)
  })
})

describe('QSO Parties without a bonus section', () => {
  // Most parties define no `bonus` block at all. Scoring and summarizing must
  // still work for them, rather than crashing on a missing bonus definition.
  it('scores and summarizes an operation for a party with no bonus rules', () => {
    const ref = { type: 'qp', ref: 'GA', location: 'FULT' }
    const score = simulateOperation({ ref, qsoCount: 3 })
    expect(score.bonusTotal).toEqual(0)
    expect(score.total).toBeGreaterThan(0)
    ReferenceHandler.summarizeScore({ score, operation: {}, ref })
    expect(score.summary).toBeTruthy()
  })
})

describe('QSO Party rover-only county activation bonus', () => {
  // Tennessee awards 500 points per county with at least 10 QSOs, but only to
  // mobile & rover operators. A fixed station activating the same county earns
  // nothing, so the bonus must be gated on the operation's `mobile` flag.
  const TN_COUNTY = { type: 'qp', ref: 'TN', location: 'ANDE' }

  it('awards the bonus to a mobile or rover station', () => {
    const score = simulateOperation({ ref: { ...TN_COUNTY, mobile: true }, qsoCount: 10 })
    expect(score.activatedCounties.ANDE).toEqual(10)
    expect(score.bonusTotal).toEqual(500)
  })

  it('awards nothing below the per-county QSO minimum', () => {
    const score = simulateOperation({ ref: { ...TN_COUNTY, mobile: true }, qsoCount: 9 })
    expect(score.bonusTotal).toEqual(0)
  })

  it('awards nothing to a fixed station in the same county', () => {
    const score = simulateOperation({ ref: TN_COUNTY, qsoCount: 10 })
    expect(score.activatedCounties).toEqual({})
    expect(score.bonusTotal).toEqual(0)
  })

  it('adds the bonus after the multiplier, as Tennessee requires', () => {
    const score = simulateOperation({ ref: { ...TN_COUNTY, mobile: true }, qsoCount: 10 })
    expect(score.total).toEqual((score.qsoPoints * score.mult) + 500)
  })
})

describe('QSO Party in-state state multiplier', () => {
  // Colorado counts 50 states, so a Colorado station working a Colorado county
  // earns both the county and Colorado itself. Working a second county adds
  // only the county, since the state is already claimed.
  it('counts our own state as a multiplier alongside the county', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CO', location: 'ADA' }, qsoCount: 2, theirLocations: ['BOU', 'PAR']
    })
    expect(Object.keys(score.counties).sort()).toEqual(['BOU', 'PAR'])
    expect(score.states.CO).toBeTruthy()
    expect(score.mult).toEqual(3)
  })

  it('does not give an out-of-state station the state multiplier', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CO', location: 'NY' }, qsoCount: 2, theirLocations: ['BOU', 'PAR']
    })
    expect(score.mult).toEqual(2)
  })

  // Tennessee counts 49 states and never Tennessee itself, so a Tennessee
  // station working Tennessee counties earns only the counties.
  it('leaves parties that exclude their own state alone', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'TN', location: 'ANDE' }, qsoCount: 2, theirLocations: ['BEDF', 'BENT']
    })
    expect(score.mult).toEqual(2)
  })
})

describe('QSO Party data', () => {
  // A party is offered in the activity options only once it has an `options`
  // block. Without `points` every QSO silently falls back to a single point,
  // so an incomplete party must never become selectable. (KS, 2026)
  it('gives every selectable party its QSO point values', () => {
    const selectable = Object.keys(QSO_PARTY_DATA).filter(key => QSO_PARTY_DATA[key].options && !QSO_PARTY_DATA[key].disabled)
    const missingPoints = selectable.filter(key => Object.keys(QSO_PARTY_DATA[key].points ?? {}).length === 0)
    expect(missingPoints).toEqual([])
  })

  it('gives every selectable party its counties', () => {
    const selectable = Object.keys(QSO_PARTY_DATA).filter(key => QSO_PARTY_DATA[key].options && !QSO_PARTY_DATA[key].disabled)
    const missingCounties = selectable.filter(key => Object.keys(QSO_PARTY_DATA[key].counties ?? {}).length === 0)
    expect(missingCounties).toEqual([])
  })
})

describe('Kansas QSO Party scoring', () => {
  // Kansas: phone 2 points, CW and RTTY 3, multipliers counted once overall,
  // and the first Kansas county logged also counts as the Kansas multiplier.
  it('scores CW QSOs at 3 points each with the state multiplier included', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'KS', location: 'ATC' }, qsoCount: 2, theirLocations: ['ALL', 'AND']
    })
    expect(score.qsoPoints).toEqual(6)
    expect(score.mult).toEqual(3)
    expect(score.total).toEqual(18)
  })

  // Kansas totals are (QSO points x multipliers) + bonus, so the one-time 100
  // point KS0KS bonus lands outside the multiplier, not inside it.
  it('adds the KS0KS bonus after the multiplier', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'KS', location: 'ATC' },
      qsoCount: 2,
      theirLocations: ['ALL', 'AND'],
      theirCalls: ['KS0KS']
    })
    expect(score.bonusTotal).toEqual(100)
    expect(score.total).toEqual((score.qsoPoints * score.mult) + 100)
    expect(score.total).toEqual(118)
  })
})

describe('Multi-state QSO Parties', () => {
  // CPQP spans three provinces, so its own key is not a multiplier. The state
  // multiplier has to come from the county's province, and a party whose
  // counties map to no state or province earns no state multiplier at all.
  it('counts the county\'s province, never the party key', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CPQP', location: 'AIR' }, qsoCount: 2, theirLocations: ['AIR', 'BRC']
    })
    expect(Object.keys(score.mults).some(mult => mult.endsWith('CPQP'))).toEqual(false)
    expect(Object.keys(score.mults).some(mult => mult.endsWith('AB'))).toEqual(true)
  })
})
