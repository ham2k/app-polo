/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function mergeQSOs (a, b) {
  if (!a || !b || a.key !== b.key) {
    return a
  }

  // Asume `b` has most updated values, and make a copy of it
  const merged = { ...b }
  if (b.refs) merged.refs = [...b.refs]

  const other = a

  // Extend times if needed
  if (other.startOnMillis && merged.startOnMillis && other.startOnMillis < merged.startOnMillis) {
    merged.startOnMillis = other.startOnMillis
    merged.startOn = other.startOn
  }

  if (other.endOnMillis && merged.endOnMillis && other.endOnMillis > merged.endOnMillis) {
    merged.endOnMillis = other.endOnMillis
    merged.endOn = other.endOn
  }

  // Merge references
  (other.refs || []).forEach(ref => {
    if (ref.type === 'pota') {
      // POTA allows multipe references, so we check type and ref
      if (!merged.refs.find(r => r.type === ref.type && r.ref === ref.ref)) {
        merged.refs.push(ref)
      }
    } else {
      // For other types of references, we only keep one per type
      if (!merged.refs.find(r => r.type === ref.type)) {
        merged.refs.push(ref)
      }
    }
  })

  return merged
}
