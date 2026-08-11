// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import cloneDeep from 'clone-deep'
import UUID from 'react-native-uuid'

import { findHooks } from '../../../../../extensions/registry'
import { selectVFO, setVFO } from '../../../../../store/station/stationSlice'
import { selectStateForComponentAndKey, setStateForComponentAndKey } from '../../../../../store/ui'
import { resetCallLookupCache } from './useCallLookup'

export function prepareNewQSO (operation, qsos, vfo, settings) {
  const qso = {
    uuid: UUID.v4(),
    band: vfo.band,
    freq: vfo.freq,
    mode: vfo.mode,
    power: vfo.power,
    _isNew: true
  }
  if (operation.local?._nextManualTime) {
    qso.startAtMillis = operation.local?._nextManualTime
    qso._manualTime = true
  }

  const activityHooks = findHooks('activity')
  activityHooks.forEach(activity => {
    if (activity.prepareNewQSO) {
      activity.prepareNewQSO({ qso, qsos, operation, vfo, settings })
    }
  })

  return qso
}

export function prepareExistingQSO (qso) {
  const clone = cloneDeep(qso || {})
  clone._isNew = false

  return clone
}

export function prepareSuggestedQSO (qso, qsos, operation, vfo, settings, currentQSO) {
  const clone = cloneDeep(qso || {})
  clone._isNew = true
  clone._isSuggested = true
  clone.uuid = UUID.v4()

  if (clone.freq) {
    clone.band = bandForFrequency(clone.freq)
    if (!clone.mode) {
      clone.mode = modeForFrequency(clone.freq)
    }
  }

  // A spot or deep link never carries its own power info. Fall back to the VFO,
  // and then to whatever power is currently on screen, so TxPowerControl never
  // gets silently blanked just because a suggestion came in.
  clone.power = clone.power ?? vfo?.power ?? currentQSO?.power

  const activityHooks = findHooks('activity')
  activityHooks.forEach(activity => {
    if (activity.prepareNewQSO) {
      activity.prepareNewQSO({ qso: clone, qsos, operation, vfo, settings })
    }
  })

  return clone
}

const DEBUG = false

// A brand-new QSO with no callsign entered is just the blank starting point
// seeded from the VFO; only preserve an interrupted entry the operator actually
// began, otherwise restoring it later would revert freq/mode to stale values.
function qsoWorthQueuing (qso) {
  return qso?._isNew && !qso?._isSuggested && !!qso?.their?.call
}

export const manageNextQSO = ({ selectedUUID, suggestedQSO, qsos, operation, settings }) => (dispatch, getState) => {
  qsos = qsos || []

  const state = getState()
  const vfo = selectVFO(state)
  const qso = selectStateForComponentAndKey(state, 'OpLoggingTab', 'qso')
  const qsoQueue = selectStateForComponentAndKey(state, 'OpLoggingTab', 'qsoQueue')
  const originalQSO = selectStateForComponentAndKey(state, 'OpLoggingTab', 'originalQSO')
  const callStack = selectStateForComponentAndKey(state, 'OpLoggingTab', 'callStack')

  if (DEBUG) {
    console.log('manageNextQSO')
    console.log('-- selectedUUID', selectedUUID)
    console.log('-- suggestedQSO', suggestedQSO)
    console.log('-- currentQSO', qso)
    console.log('-- currentQSOQueue', qsoQueue)
  }

  let nextQSO
  if (suggestedQSO) {
    nextQSO = prepareSuggestedQSO(suggestedQSO, qsos, operation, vfo, settings, qso)
    if (suggestedQSO._updatesVFO) {
      // Only a deep link's freq/mode is authoritative (the companion app is reporting
      // the radio's real state) — record it as the VFO so subsequent new QSOs (which
      // are seeded from the VFO) start from it. A spot tap must NOT do this: the
      // operator is just considering a QSO, and the VFO should stay where it was.
      const vfoUpdate = {}
      if (nextQSO.freq) vfoUpdate.freq = nextQSO.freq
      if (nextQSO.band) vfoUpdate.band = nextQSO.band
      if (nextQSO.mode) vfoUpdate.mode = nextQSO.mode
      if (Object.keys(vfoUpdate).length) dispatch(setVFO(vfoUpdate))
    }
    if (qsoWorthQueuing(qso)) {
      dispatch(setStateForComponentAndKey({
        component: 'OpLoggingTab',
        key: 'qsoQueue',
        value: [...qsoQueue || [], { qso, originalQSO, callStack }]
      }))
    }
    if (DEBUG) console.log(' >> suggested', nextQSO)
  } else if (selectedUUID) {
    const existingQSO = qsos.find(q => q.uuid === selectedUUID)
    if (existingQSO) {
      nextQSO = prepareExistingQSO(existingQSO)
    } else {
      nextQSO = prepareNewQSO(operation, qsos, vfo, settings)
    }
    if (qsoWorthQueuing(qso)) {
      dispatch(setStateForComponentAndKey({
        component: 'OpLoggingTab',
        key: 'qsoQueue',
        value: [...qsoQueue || [], { qso, originalQSO, callStack }]
      }))
    }
    if (DEBUG) console.log(' >> selected', nextQSO)
  } else {
    if (qsoQueue?.length > 0) {
      const queueItem = qsoQueue[qsoQueue.length - 1]
      nextQSO = queueItem?.qso ?? prepareNewQSO(operation, qsos, vfo, settings)
      if (queueItem?.originalQSO) {
        if (DEBUG) console.log(' >> queue item originalQSO', queueItem.originalQSO)
        dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'originalQSO', value: queueItem.originalQSO }))
        dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'callStack', value: queueItem.callStack }))
      }
      dispatch(setStateForComponentAndKey({
        component: 'OpLoggingTab',
        key: 'qsoQueue',
        value: qsoQueue.slice(0, -1)
      }))
      if (DEBUG) console.log(' >> queue', nextQSO)
    } else {
      nextQSO = prepareNewQSO(operation, qsos, vfo, settings)

      if (callStack) {
        nextQSO.their = nextQSO.their || {}
        nextQSO.their.call = callStack
        dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'callStack', value: undefined }))
      }
      if (DEBUG) console.log(' >> new', nextQSO)
    }
  }
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'qso', value: nextQSO }))
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'selectedUUID', value: nextQSO?.uuid }))
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'operationUUID', value: operation?.uuid }))
  dispatch(resetCallLookupCache())
}

// When the logging tab is focused for a different operation than the one the current QSO belongs to,
// we don't want to keep editing that QSO against the new operation (which would mix data up).
// Instead we preserve any entered data as a newly suggested QSO, detached from the previous operation.
export const manageQSOForOperationChange = ({ operation }) => (dispatch, getState) => {
  if (!operation?.uuid) return

  const state = getState()
  const operationUUID = selectStateForComponentAndKey(state, 'OpLoggingTab', 'operationUUID')

  // Same operation: keep the current QSO as-is (survives navigation, rotation, etc.)
  if (operationUUID === operation.uuid) return

  const qso = selectStateForComponentAndKey(state, 'OpLoggingTab', 'qso')
  const hasChanges = selectStateForComponentAndKey(state, 'OpLoggingTab', 'hasChanges')

  // The queue and call stack belong to the previous operation, so clear them.
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'operationUUID', value: operation.uuid }))
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'qsoQueue', value: [] }))
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'callStack', value: undefined }))

  if (qso && hasChanges) {
    // Preserve the entered data, but detach it from the previous operation and present it as a suggestion.
    const migrated = cloneDeep(qso)
    migrated.uuid = UUID.v4()
    migrated._isNew = true
    migrated._isSuggested = true
    delete migrated.operation
    delete migrated._willBeDeleted
    delete migrated.deleted

    dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'qso', value: migrated }))
    dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'originalQSO', value: undefined }))
    dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'selectedUUID', value: migrated.uuid }))
    dispatch(resetCallLookupCache())
  } else {
    // Nothing worth preserving: start fresh for the new operation.
    dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'qso', value: undefined }))
    dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'originalQSO', value: undefined }))
    dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'selectedUUID', value: undefined }))
  }
}
