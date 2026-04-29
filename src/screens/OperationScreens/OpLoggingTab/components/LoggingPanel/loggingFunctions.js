/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import cloneDeep from 'clone-deep'
import UUID from 'react-native-uuid'

import { findHooks } from '../../../../../extensions/registry'
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

export function prepareSuggestedQSO (qso, qsos, operation, vfo, settings) {
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

  if (vfo?.power) {
    clone.power = vfo.power
  }

  const activityHooks = findHooks('activity')
  activityHooks.forEach(activity => {
    if (activity.prepareNewQSO) {
      activity.prepareNewQSO({ qso, qsos, operation, vfo, settings })
    }
  })

  return clone
}

export const manageNextQSO = ({ selectedUUID, suggestedQSO, qsos, operation, vfo, settings }) => (dispatch, getState) => {
  const state = getState()
  const qso = selectStateForComponentAndKey(state, 'OpLoggingTab', 'qso')
  const qsoQueue = selectStateForComponentAndKey(state, 'OpLoggingTab', 'qsoQueue')
  const originalQSO = selectStateForComponentAndKey(state, 'OpLoggingTab', 'originalQSO')
  const callStack = selectStateForComponentAndKey(state, 'OpLoggingTab', 'callStack')

  // console.log('manageNextQSO')
  // console.log('-- selectedUUID', selectedUUID)
  // console.log('-- suggestedQSO', suggestedQSO)
  // console.log('-- currentQSO', qso)
  // console.log('-- currentQSOQueue', qsoQueue)
  let nextQSO
  if (suggestedQSO) {
    nextQSO = prepareSuggestedQSO(suggestedQSO, qsos, operation, vfo, settings)
    if (qso?._isNew && !qso?._isSuggested) {
      dispatch(setStateForComponentAndKey({
        component: 'OpLoggingTab',
        key: 'qsoQueue',
        value: [...qsoQueue || [], { qso, originalQSO, callStack }]
      }))
    }
    // console.log(' >> suggested', nextQSO)
  } else if (selectedUUID) {
    const existingQSO = qsos.find(q => q.uuid === selectedUUID)
    if (existingQSO) {
      nextQSO = prepareExistingQSO(existingQSO)
    } else {
      nextQSO = prepareNewQSO(operation, qsos, vfo, settings)
    }
    if (qso?._isNew && !qso?._isSuggested) {
      dispatch(setStateForComponentAndKey({
        component: 'OpLoggingTab',
        key: 'qsoQueue',
        value: [...qsoQueue || [], { qso, originalQSO, callStack }]
      }))
    }
    // console.log(' >> selected', nextQSO)
  } else {
    if (qsoQueue?.length > 0) {
      const queueItem = qsoQueue[qsoQueue.length - 1]
      nextQSO = queueItem?.qso ?? prepareNewQSO(operation, qsos, vfo, settings)
      if (queueItem?.originalQSO) {
        // console.log(' >> queue item originalQSO', queueItem.originalQSO)
        dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'originalQSO', value: queueItem.originalQSO }))
        dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'callStack', value: queueItem.callStack }))
      }
      dispatch(setStateForComponentAndKey({
        component: 'OpLoggingTab',
        key: 'qsoQueue',
        value: qsoQueue.slice(0, -1)
      }))
      // console.log(' >> queue', nextQSO)
    } else {
      nextQSO = prepareNewQSO(operation, qsos, vfo, settings)

      if (callStack) {
        nextQSO.their = nextQSO.their || {}
        nextQSO.their.call = callStack
        dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'callStack', value: undefined }))
      }
      // console.log(' >> new', nextQSO)
    }
  }
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'qso', value: nextQSO }))
  dispatch(setStateForComponentAndKey({ component: 'OpLoggingTab', key: 'selectedUUID', value: nextQSO?.uuid }))
  dispatch(resetCallLookupCache())
}
