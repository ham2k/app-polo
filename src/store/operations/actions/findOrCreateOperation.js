// Copyright ©️ 2026 Jeff Kowalski <jeff.kowalski@gmail.com>
// SPDX-License-Identifier: MPL-2.0

import { activationTypeForKey } from '../../../tools/deepLinkTools'
import { selectAllOperations } from '../operationsSlice'
import { addNewOperation } from './operationsDB'
import { mergeDataIntoOperation } from './setOperationData'

export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Find a recent operation activating exactly `ourRefs` (as `[{ type, ref }]`
 * activity-key pairs), or create one.
 *
 * Matching is an exact set comparison: an operation is reused only when its
 * activation references are precisely the requested set, no more, no less.
 * A park-only request must not latch onto a park+summit operation (those are
 * distinct activations), and a park+summit request must not reuse a park-only
 * operation.
 */
export const findOrCreateOperation = ({ ourRefs }) => async (dispatch, getState) => {
  const operations = selectAllOperations(getState())
  const cutoff = Date.now() - RECENT_WINDOW_MS
  const wantedRefs = ourRefs.map(({ type, ref }) => ({ type: activationTypeForKey(type), ref }))

  const existingOp = Object.values(operations || {}).find(op => {
    if (!op || op.deleted) return false
    const lastActive = op.startAtMillisMax || op.createdAtMillis || 0
    if (lastActive < cutoff) return false
    return sameRefSet(op.refs, wantedRefs)
  })
  if (existingOp) return existingOp

  // Decorate the refs and derive title/grid BEFORE creating the operation, so
  // it is stored complete in one write. Creating first and titling second
  // leaves a window where the screen mounting on the new operation reads the
  // untitled version back from the database and clobbers the title.
  let attrs = { refs: wantedRefs }
  try {
    attrs = await dispatch(mergeDataIntoOperation({ operation: {}, data: { refs: wantedRefs } }))
  } catch (e) {
    // Decoration is best-effort; fall back to the undecorated refs.
  }

  return await dispatch(addNewOperation({ ...attrs, _isNew: true }))
}

/**
 * True when an operation's references are exactly the same set as `wantedRefs`
 * (same type:ref pairs, in any order).
 */
function sameRefSet (opRefs, wantedRefs) {
  const present = (opRefs || []).filter(r => r?.type && r?.ref)
  if (present.length !== wantedRefs.length) return false
  const keyOf = r => `${r.type}:${r.ref}`
  const opKeys = new Set(present.map(keyOf))
  return wantedRefs.every(r => opKeys.has(keyOf(r)))
}
