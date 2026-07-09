// Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
// SPDX-License-Identifier: MPL-2.0

import { hasMultipleSegmentsForQSOs, isActiveSegmentEvent } from './QSOListTools'

function qso (uuid) {
  return { uuid, band: '20m' }
}

function segmentEvent (uuid, event) {
  return {
    uuid,
    band: 'event',
    event: { event }
  }
}

describe('QSOListTools', () => {
  test('recognizes active segment events', () => {
    expect([
      isActiveSegmentEvent(segmentEvent('start', 'start')),
      isActiveSegmentEvent(segmentEvent('break', 'break')),
      isActiveSegmentEvent(segmentEvent('end', 'end')),
      isActiveSegmentEvent({ ...segmentEvent('deleted-break', 'break'), deleted: true }),
      isActiveSegmentEvent(qso('a'))
    ]).toMatchInlineSnapshot(`
      [
        true,
        true,
        false,
        false,
        false,
      ]
    `)
  })

  test('keeps new and single-start operations in single-segment mode', () => {
    expect([
      hasMultipleSegmentsForQSOs([]),
      hasMultipleSegmentsForQSOs([qso('a'), qso('b')]),
      hasMultipleSegmentsForQSOs([segmentEvent('start', 'start'), qso('a')]),
      hasMultipleSegmentsForQSOs([qso('a'), segmentEvent('break', 'break'), qso('b')])
    ]).toMatchInlineSnapshot(`
      [
        false,
        false,
        false,
        false,
      ]
    `)
  })

  test('promotes operations with multiple segment events to multi-segment mode', () => {
    expect([
      hasMultipleSegmentsForQSOs([segmentEvent('start', 'start'), qso('a'), segmentEvent('break', 'break'), qso('b')]),
      hasMultipleSegmentsForQSOs([qso('a'), { ...segmentEvent('deleted-break', 'break'), deleted: true }])
    ]).toMatchInlineSnapshot(`
      [
        true,
        false,
      ]
    `)
  })
})
