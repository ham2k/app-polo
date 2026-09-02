// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../../../ui/index.js', () => ({}))
jest.mock('./ARRLVHFContestsOptions', () => ({ ActivityOptions: () => null }))

import { ActivityHook, ReferenceHandler } from './ARRLVHFContestsExtension'

const TEN_GIG_REF = { type: 'arrl-vhf-tests', ref: 'ARRL-10G-SEP' }

function simulateOperation ({ ref, grid = 'FN21rq', contacts }) {
  const operation = { grid }
  const qsos = []
  const scores = []
  let score

  contacts.forEach((contact, i) => {
    const qso = {
      uuid: `qso-${i}`,
      startAtMillis: contact.startAtMillis ?? 1000 + i,
      band: contact.band ?? '3cm',
      their: { call: contact.call, grid: contact.grid }
    }
    // Production scores against the full QSO list, including the QSO being scored
    qsos.push(qso)
    const qsoScore = ReferenceHandler.scoringForQSO({ qso, qsos, operation, ref, score })
    score = ReferenceHandler.accumulateScoreForOperation({ qsoScore, score, operation, ref })
    scores.push(qsoScore)
  })

  return { score, scores }
}

describe('ARRL 10 GHz and Up scoring', () => {
  // Rules 5.1–5.4: distance in km × band factor, plus 100 QSO points per
  // unique call sign per band. QSO points are not multiplied by the band factor.
  it('scores distance times band factor plus QSO points', () => {
    const { scores } = simulateOperation({ ref: TEN_GIG_REF, contacts: [{ call: 'KN2X', grid: 'FN21so', band: '2.5mm' }] })
    expect(scores[0].distance).toBeGreaterThan(0)
    expect(scores[0].value).toEqual(scores[0].distance * 5 + 100)
  })

  it('does not multiply QSO points by the band factor', () => {
    const { scores } = simulateOperation({ ref: TEN_GIG_REF, contacts: [{ call: 'KN2X', grid: 'FN21so', band: '1.25cm' }] })
    expect(scores[0].value).toEqual(scores[0].distance * 2 + 100)
  })

  it('still awards QSO points after an earlier gridless contact with the same call', () => {
    const { scores, score } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X' }, { call: 'KN2X', grid: 'FN21so' }]
    })
    expect(scores[0].value).toBeUndefined()
    expect(scores[0].alerts).toContain('theirGrid')
    expect(scores[1].value).toEqual(scores[1].distance * 1 + 100)
    expect(score.total).toEqual(scores[1].value)
    expect(score.dupeCount).toEqual(0)
  })

  it('awards QSO points to exactly one of two same-time contacts from different locations', () => {
    const { scores } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X', grid: 'FN21so', startAtMillis: 1000 }, { call: 'KN2X', grid: 'FN31aa', startAtMillis: 1000 }]
    })
    const withPoints = scores.filter(s => s.value === s.distance + 100)
    expect(withPoints).toHaveLength(1)
  })

  it('flags a repeat contact from the same locations as a dupe', () => {
    const { scores, score } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X', grid: 'FN21so' }, { call: 'KN2X', grid: 'FN21so' }]
    })
    expect(scores[1].value).toEqual(0)
    expect(scores[1].alerts).toContain('duplicate')
    expect(score.dupeCount).toEqual(1)
  })

  it('awards only distance points when a call is re-worked on a band from a new location', () => {
    const { scores } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X', grid: 'FN21so' }, { call: 'KN2X', grid: 'FN31aa' }]
    })
    expect(scores[1].alerts).toEqual([])
    expect(scores[1].value).toEqual(scores[1].distance * 1)
  })

  it('awards QSO points again for the same call on a different band', () => {
    const { scores, score } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X', grid: 'FN21so', band: '3cm' }, { call: 'KN2X', grid: 'FN21so', band: '1.25cm' }]
    })
    expect(scores[1].value).toEqual(scores[1].distance * 2 + 100)
    expect(score.total).toEqual(scores[0].value + scores[1].value)
  })

  it('scores submillimeter contacts with the top band factor', () => {
    const { scores } = simulateOperation({ ref: TEN_GIG_REF, contacts: [{ call: 'KN2X', grid: 'FN21so', band: 'submm' }] })
    expect(scores[0].alerts).toEqual([])
    expect(scores[0].value).toEqual(scores[0].distance * 5 + 100)
  })

  it('flags a missing grid instead of silently scoring nothing', () => {
    const { scores, score } = simulateOperation({ ref: TEN_GIG_REF, contacts: [{ call: 'KN2X' }] })
    expect(scores[0].alerts).toContain('theirGrid')
    expect(score.total).toEqual(0)
    expect(score.dupeCount).toEqual(0)
  })

  it('flags a grid shorter than the exchange requires and awards QSO points only to the full-grid contact', () => {
    const { scores, score } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X', grid: 'FN21' }, { call: 'KN2X', grid: 'FN21so' }]
    })
    expect(scores[0].alerts).toContain('shortGrid')
    expect(scores[0].qsoPoints).toEqual(0)
    expect(scores[1].alerts).toEqual([])
    expect(scores[1].value).toEqual(scores[1].distance + 100)
    expect(score.qsoPoints).toEqual(100)
  })

  it('flags a band with no points entry in points-scored events instead of dropping the QSO', () => {
    const ref = { type: 'arrl-vhf-tests', ref: 'ARRL-VHF-JAN' }
    const { scores, score } = simulateOperation({ ref, contacts: [{ call: 'KN2X', grid: 'FN21so', band: '4m' }] })
    expect(scores[0].alerts).toContain('invalidBand')
    expect(score.dupeCount).toEqual(0)
  })

  it('does not count an invalid band as a dupe', () => {
    const { scores, score } = simulateOperation({ ref: TEN_GIG_REF, contacts: [{ call: 'KN2X', grid: 'FN21so', band: '2m' }] })
    expect(scores[0].alerts).toContain('invalidBand')
    expect(score.dupeCount).toEqual(0)
  })

  it('reports distance points and QSO points separately in the summary', () => {
    // A re-worked call earns distance but no QSO points, so the two components diverge
    const { score } = simulateOperation({
      ref: TEN_GIG_REF,
      contacts: [{ call: 'KN2X', grid: 'FN21so' }, { call: 'KN2X', grid: 'FN31aa' }]
    })
    expect(score.qsoPoints).toEqual(100)
    expect(score.distancePoints).toEqual(score.total - 100)
    const summarized = ReferenceHandler.summarizeScore({ score, ref: TEN_GIG_REF })
    expect(summarized.summary).toEqual(`${score.total} pts`)
    expect(summarized.longSummary).toMatch(`${score.distancePoints} distance points + 100 QSO points`)
    expect(summarized.longSummary).toMatch(/km total/)
  })
})

describe('ARRL VHF exchange fields', () => {
  // The 10 GHz contests exchange 6-character grids, so the grid input should flag shorter entries
  it('requires a 6-character grid for grid6 events', () => {
    const fields = ActivityHook.standardExchangeFields({ operation: { refs: [TEN_GIG_REF] } })
    expect(fields.grid).toEqual({ show: true, requiredLength: 6 })
  })

  it('requires a 4-character grid for grid4 events', () => {
    const fields = ActivityHook.standardExchangeFields({ operation: { refs: [{ type: 'arrl-vhf-tests', ref: 'ARRL-VHF-JAN' }] } })
    expect(fields.grid).toEqual({ show: true, requiredLength: 4 })
  })

  it('only asks to show the grid when the operation is not a VHF contest', () => {
    const fields = ActivityHook.standardExchangeFields({ operation: { refs: [] } })
    expect(fields.grid).toEqual(true)
  })
})
