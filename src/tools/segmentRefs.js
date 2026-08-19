// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

/*
 * When exporting a log with multiple segments, each `start` or `break` event carries the
 * operation data in effect for the segment that follows it.
 *
 * Ref-scoped exports (a single POTA park, one QSO Party) must not have their refs swapped
 * out mid-file by a segment that activated something else. But a segment can also change
 * *attributes* of a ref that stays the same throughout the operation, like the county we're
 * operating from in a QSO Party, and those changes do belong in the export.
 *
 * So unless the export asked for all segment refs, we only update the refs we started with,
 * matching them by type and ref.
 */
export function refsForSegment ({ refs, segmentRefs, combineSegmentRefs }) {
  if (!segmentRefs) return refs
  if (combineSegmentRefs) return segmentRefs

  return (refs ?? []).map(ref => segmentRefs.find(r => r.type === ref.type && r.ref === ref.ref) ?? ref)
}
