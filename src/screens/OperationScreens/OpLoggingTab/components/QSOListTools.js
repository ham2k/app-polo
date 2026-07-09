// Copyright ©️ 2026 Robert Jackson <me@rwjblue.com>
// SPDX-License-Identifier: MPL-2.0

export function hasMultipleSegmentsForQSOs (qsos) {
  const activeSegmentEvents = (qsos ?? []).filter(isActiveSegmentEvent)

  return activeSegmentEvents.length > 1
}

export function isActiveSegmentEvent (qso) {
  return !qso?.deleted && qso?.band === 'event' && (qso.event?.event === 'start' || qso.event?.event === 'break')
}
