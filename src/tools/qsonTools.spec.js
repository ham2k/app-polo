/*
 * Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterNearDupes, filterQSOsWithSectionRefs } from './qsonTools'

describe('filterQSOsWithSectionRefs', () => {
  it('tracks section refs across start/break events and filters by section ref', () => {
    const operation = {
      refs: [{ type: 'pota', ref: 'US-1001' }],
      grid: 'FN31'
    }

    const qsos = [
      { uuid: 'qso-initial', their: { call: 'K1AAA' } },
      {
        uuid: 'event-start',
        event: {
          event: 'start',
          operation: {
            refs: [{ type: 'pota', ref: 'US-2002' }],
            grid: 'FM18'
          }
        }
      },
      { uuid: 'qso-second', their: { call: 'K1BBB' } },
      {
        uuid: 'event-break',
        event: {
          event: 'break',
          operation: {
            refs: [{ type: 'pota', ref: 'US-3003' }],
            grid: 'EM12'
          }
        }
      },
      { uuid: 'qso-third', their: { call: 'K1CCC' } }
    ]

    const filtered = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [{ type: 'pota', ref: 'US-2002' }],
      withEvents: true
    })

    expect(filtered.map(q => q.uuid)).toEqual(['event-start', 'qso-second'])
  })

  it('respects section transitions across multiple breaks', () => {
    const park1 = { type: 'pota', ref: 'US-1111' }
    const sota1 = { type: 'sota', ref: 'W1/AA-001' }
    const sota2 = { type: 'sota', ref: 'W1/AA-002' }

    const operation = {
      refs: [park1, sota1]
    }

    const qsos = [
      { uuid: 'qso-1', their: { call: 'K1AAA' } },
      { uuid: 'break-1', event: { event: 'break', operation: { refs: [park1, sota2] } } },
      { uuid: 'qso-2', their: { call: 'K1BBB' } },
      { uuid: 'break-2', event: { event: 'break', operation: { refs: [park1] } } },
      { uuid: 'qso-3', their: { call: 'K1CCC' } },
      { uuid: 'break-3', event: { event: 'break', operation: { refs: [park1, sota1] } } },
      { uuid: 'qso-4', their: { call: 'K1DDD' } }
    ]

    const withSota1 = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [sota1]
    })

    const withSota2 = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [sota2]
    })

    const withPark1 = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [park1]
    })

    const withPark1Sota1 = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [park1, sota1]
    })

    const withSota1Park1 = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [sota1, park1]
    })

    const withSota1Sota2 = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withSectionRefs: [sota1, sota2]
    })

    expect(withSota1.map(q => q.uuid)).toEqual(['qso-1', 'qso-4'])
    expect(withSota2.map(q => q.uuid)).toEqual(['qso-2'])
    expect(withPark1.map(q => q.uuid)).toEqual(['qso-1', 'qso-2', 'qso-3', 'qso-4'])
    expect(withPark1Sota1.map(q => q.uuid)).toEqual(['qso-1', 'qso-4'])
    expect(withSota1Park1.map(q => q.uuid)).toEqual(['qso-1', 'qso-4'])
    expect(withSota1Sota2.map(q => q.uuid)).toEqual([])
  })

  it('passes section refs/grid to the custom filter and ignores malformed withSectionRefs entries', () => {
    const operation = {
      refs: [{ type: 'sota', ref: 'W1/AA-001' }],
      grid: 'FN31'
    }

    const qsos = [
      { uuid: 'q1', their: { call: 'K1AAA' } },
      {
        uuid: 'start-event',
        event: {
          event: 'start',
          operation: {
            refs: [{ type: 'sota', ref: 'W1/AA-002' }],
            grid: 'FN20'
          }
        }
      },
      { uuid: 'q2', their: { call: 'K1BBB' } },
      { uuid: 'q3', their: { call: 'K1CCC' }, deleted: true }
    ]

    const seen = []
    const filtered = filterQSOsWithSectionRefs({
      qsos,
      operation,
      withEvents: true,
      withDeleted: true,
      withSectionRefs: [{ type: 'sota', ref: 'W1/AA-002' }, { type: 'sota' }, null],
      filter: ({ qso, sectionRefs, sectionGrid }) => {
        seen.push({ uuid: qso.uuid, sectionRefs, sectionGrid })
        return !qso.deleted
      }
    })

    expect(filtered.map(q => q.uuid)).toEqual(['start-event', 'q2'])
    expect(seen).toEqual([
      {
        uuid: 'start-event',
        sectionRefs: [{ type: 'sota', ref: 'W1/AA-002' }],
        sectionGrid: 'FN20'
      },
      {
        uuid: 'q2',
        sectionRefs: [{ type: 'sota', ref: 'W1/AA-002' }],
        sectionGrid: 'FN20'
      },
      {
        uuid: 'q3',
        sectionRefs: [{ type: 'sota', ref: 'W1/AA-002' }],
        sectionGrid: 'FN20'
      }
    ])
  })

  it('excludes events/deleted entries by default', () => {
    const filtered = filterQSOsWithSectionRefs({
      qsos: [
        { uuid: 'q1', their: { call: 'K1AAA' } },
        { uuid: 'q2', their: { call: 'K1BBB' }, deleted: true },
        { uuid: 'q3', event: { event: 'start', operation: { refs: [] } } }
      ],
      operation: { refs: [] }
    })

    expect(filtered.map(q => q.uuid)).toEqual(['q1'])
  })
})

describe('filterNearDupes', () => {
  it('returns only earlier QSOs with same call and different uuid', () => {
    const qsos = [
      { uuid: 'q1', their: { call: 'K1ABC' }, startAtMillis: 900 },
      { uuid: 'q2', their: { call: 'K1ABC' }, startAtMillis: 1000 },
      { uuid: 'q3', their: { call: 'K1ABC' }, startAtMillis: 1100 },
      { uuid: 'q5', their: { call: 'K1ABC' }, startAtMillis: 1300 },
      { uuid: 'q7', their: { call: 'K1ABC' }, startAtMillis: 800, deleted: true },
      { uuid: 'q8', their: { call: 'K1ABC' }, startAtMillis: 700, event: { event: 'note' } }
    ]

    const nearDupesForQ2 = filterNearDupes({
      qso: { uuid: 'q2', their: { call: 'K1ABC' }, startAtMillis: 1000 },
      qsos,
      operation: { refs: [] }
    })

    const nearDupesForQ4 = filterNearDupes({
      qso: { uuid: 'q4', their: { call: 'K1ABC' }, startAtMillis: 1200 },
      qsos,
      operation: { refs: [] }
    })

    const nearDupesForQ6 = filterNearDupes({
      qso: { uuid: 'q6', their: { call: 'K1ABC' }, startAtMillis: 1400 },
      qsos,
      operation: { refs: [] }
    })

    expect(nearDupesForQ2.map(q => q.uuid)).toEqual(['q1'])
    expect(nearDupesForQ4.map(q => q.uuid)).toEqual(['q1', 'q2', 'q3'])
    expect(nearDupesForQ6.map(q => q.uuid)).toEqual(['q1', 'q2', 'q3', 'q5'])
  })

  it('honors section refs and optional filter for near-dupes', () => {
    const qsos = [
      { uuid: 'before-a', their: { call: 'K1ABC' }, startAtMillis: 100 },
      {
        uuid: 'switch-section',
        event: {
          event: 'break',
          operation: { refs: [{ type: 'pota', ref: 'US-2222' }] }
        }
      },
      { uuid: 'before-b', their: { call: 'K1ABC' }, startAtMillis: 200, band: '20m' },
      { uuid: 'before-c', their: { call: 'K1ABC' }, startAtMillis: 300, band: '40m' },
      { uuid: 'target', their: { call: 'K1ABC' }, startAtMillis: 500, band: '20m' }
    ]

    const nearDupes = filterNearDupes({
      qso: qsos[4],
      qsos,
      operation: { refs: [{ type: 'pota', ref: 'US-1111' }] },
      withSectionRefs: [{ type: 'pota', ref: 'US-2222' }],
      filter: ({ qso }) => qso.band === '20m'
    })

    expect(nearDupes.map(q => q.uuid)).toEqual(['before-b'])
  })
})
