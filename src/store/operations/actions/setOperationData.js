/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bandForFrequency } from '@ham2k/lib-operation-data'
import { actions, selectOperation } from '../operationsSlice'
import { saveOperation, saveOperationLocalData } from './operationsDB'
import { findHooks } from '../../../extensions/registry'
import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'
import { addQSO, newEventQSO, selectQSOs } from '../../qsos'

export const setOperationLocalData = (data) => async (dispatch, getState) => {
  try {
    const { uuid } = data

    if (data.power) data.power = parseInt(data.power, 10)

    if (data.freq) {
      data.band = bandForFrequency(data.freq)
    } else if (data.band) {
      data.freq = undefined
    }

    await dispatch(actions.setOperationLocal(data))
    const savedOperation = selectOperation(getState(), uuid) ?? {}
    return dispatch(saveOperationLocalData(savedOperation))
  } catch (e) {
    reportError('Error in setOperationData', e)
  }
}

export const setOperationData = (data) => async (dispatch, getState) => {
  try {
    const { uuid } = data
    const state = getState()
    const operation = selectOperation(state, uuid) ?? {}
    const qsos = selectQSOs(state, uuid) ?? []

    const mergedOperation = await dispatch(mergeDataIntoOperation({ operation, data }))

    await updateOperationBreakOrStart({ operation: mergedOperation, qsos, dispatch })

    await dispatch(actions.setOperation(mergedOperation))
    const savedOperation = selectOperation(getState(), uuid) ?? {}

    return dispatch(saveOperation(savedOperation))
  } catch (e) {
    console.log('Error in setOperationData', e)
    reportError('Error in setOperationData', e)
  }
}

export const mergeDataIntoOperation = ({ operation, data }) => async (dispatch, getState) => {
  const now = Date.now()

  operation.createdAtMillis = operation.createdAtMillis || now
  operation.createdOnDeviceId = operation.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
  operation.updatedAtMillis = now
  operation.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

  if (data.refs) {
    const decoratedRefs = []
    for (const ref of data.refs) {
      let decoratedRef = ref
      const hooks = findHooks(`ref:${ref.type}`)
      for (const hook of hooks) {
        if (hook?.decorateRefWithDispatch) {
          decoratedRef = await dispatch(hook.decorateRefWithDispatch(decoratedRef)) ?? ref
        } else if (hook?.decorateRef) {
          decoratedRef = hook.decorateRef(decoratedRef) ?? ref
        }
      }
      decoratedRefs.push(decoratedRef)
    }

    data.refs = decoratedRefs.filter(ref => ref?.type)
  }

  if (data.description) {
    data.title = data.description
    data.subtitle = ''
  } else if (data.refs && !operation.description) {
    const referenceTitles = data.refs.map(ref => {
      const hooks = findHooks(`ref:${ref?.type}`)
      return hooks.map(hook => hook?.suggestOperationTitle && hook?.suggestOperationTitle(ref)).filter(x => x)[0]
    }).filter(x => x).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    const titleParts = []

    const plainTitles = referenceTitles.map(ref => ref.title).filter(x => x).join(', ')
    const forTitles = referenceTitles.map(ref => ref.for).filter(x => x).join(', ')
    const atTitles = referenceTitles.map(ref => ref.at).filter(x => x).join(', ')
    if (plainTitles) titleParts.push(plainTitles)
    if (forTitles) titleParts.push('for ' + forTitles)
    if (atTitles) titleParts.push('at ' + atTitles)

    const subtitleParts = referenceTitles.map(ref => ref.subtitle).filter(x => x)

    if (titleParts.length) {
      data.title = titleParts.join(' ')
      data.subtitle = subtitleParts.join(' • ')
    } else {
      data.title = 'General Operation'
      data.subtitle = subtitleParts.join(' • ')
    }
  }

  if (!operation.title && (!data.title || data.title === 'at ')) {
    data.title = 'General Operation'
    data.subtitle = ''
  }

  // If no grid is set, or the grid is set from refs, and this update include refs, then update the grid too
  if (!data.grid && data.refs && (!operation.grid || operation.gridSource === 'refs')) {
    const gridRef = (data.refs || []).find(ref => ref.grid)
    if (gridRef) {
      data.grid = gridRef.grid
      data.gridSource = 'refs'
    } else {
      data.grid = ''
      data.gridSource = ''
    }
  }

  return { ...operation, ...data }
}

const DEBUG = true
export async function markOperationStart({ operation, qsos, dispatch }) {
  if (!operation) return
  if (DEBUG) console.log('markOperationStart', operation, qsos)
  if (qsos?.find(qso => qso.event?.event === 'start')) {
    if (DEBUG) console.log('-- already started')
    return
  }

  if (DEBUG) console.log('-- adding start event', captureOperationParameters({ operation }))
  if (DEBUG) console.log('-- description', describeOperation({ operation }))
  await dispatch(newEventQSO({
    uuid: operation.uuid,
    startAtMillis: qsos?.[0] ? qsos[0].startAtMillis - 1000 : Date.now(),
    event: {
      event: 'start',
      operation: captureOperationParameters({ operation }),
      description: describeOperation({ operation }),
    }
  }))
}

export async function updateOperationBreakOrStart({ operation, qsos, dispatch }) {
  if (!operation) return

  if (DEBUG) console.log('updateOperationBreakOrStart')
  const lastBreakOrStart = qsos?.findLast(qso => qso.event?.event === 'break' || qso.event?.event === 'start')
  if (!lastBreakOrStart) {
    if (DEBUG) console.log('-- no last break or start')
    // Do nothing, since the operation has no breaks or starts
  } else {
    const data = captureOperationParameters({ operation })
    if (DEBUG) console.log('-- last break or start', lastBreakOrStart.event)
    if (DEBUG) console.log('-- data', data)
    if (DEBUG) console.log('-- describeOperation', describeOperation({ operation: data }))
    // Compare current operation data with last break/start event data

    if (JSON.stringify(data) === JSON.stringify(lastBreakOrStart?.event?.operation)) {
      return // No changes needed if data matches
    }

    if (DEBUG) console.log('-- data changed, updating event')
    await dispatch(addQSO({
      uuid: operation.uuid,
      qso: {
        ...lastBreakOrStart,
        event: {
          ...lastBreakOrStart.event,
          operation: data,
          description: describeOperation({ operation: data }),
        }
      }
    }))
  }
}

export async function markOperationBreak({ operation, qsos, dispatch }) {
  if (!operation) return

  if (DEBUG) console.log('markOperationBreak')
  const lastBreakOrStart = qsos?.findLast(qso => qso.event?.event === 'break' || qso.event?.event === 'start')
  if (!lastBreakOrStart) {
    if (DEBUG) console.log('-- no last break or start, adding start')
    await markOperationStart({ operation, qsos, dispatch })
  } else {
    await updateOperationBreakOrStart({ operation, qsos, dispatch, lastBreakOrStart })
  }

  if (DEBUG) console.log('-- adding break event', captureOperationParameters({ operation }))
  await dispatch(newEventQSO({
    uuid: operation.uuid,
    event: {
      event: 'break',
      operation: captureOperationParameters({ operation }),
      description: describeOperation({ operation })
    }
  }))
}

export async function markOperationStop({ operation, qsos, dispatch }) {
  if (!operation) return

  const previousStop = qsos?.findLast(qso => qso.event?.event === 'stop')

  if (previousStop) {
    await dispatch(addQSO({
      uuid: operation.uuid,
      qso: {
        ...previousStop,
        startAtMillis: Date.now(),
        endAtMillis: undefined,
        event: {
          ...previousStop.event,
          operation: captureOperationParameters({ operation }),
          description: describeOperation({ operation })
        }
      }
    }))
  } else {
    await dispatch(newEventQSO({
      uuid: operation.uuid,
      startAtMillis: Date.now(),
      endAtMillis: undefined,
      event: {
        event: 'stop'
      }
    }))
  }
}

export function captureOperationParameters({ operation }) {
  if (!operation) return {}
  const params = {}
  if (operation?.refs) params.refs = operation.refs
  if (operation?.grid) params.grid = operation.grid
  return params
}

export function describeOperation({ operation }) {
  console.log('describeOperation', operation)
  if (!operation) return ''

  const referenceTitles = (operation?.refs ?? []).map(ref => {
    const hooks = findHooks(`ref:${ref?.type}`)
    return hooks.map(hook => hook?.suggestOperationTitle && hook?.suggestOperationTitle(ref)).filter(x => x)[0]
  }).filter(x => x).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  const titleParts = []

  referenceTitles.forEach(ref => {
    if (ref.description) {
      titleParts.push(ref.description)
    } else if (ref.at) {
      titleParts.push(`at ${ref.at}`)
    } else if (ref.for) {
      titleParts.push('for ' + ref.for)
    } else if (ref.title) {
      titleParts.push(ref.title)
    } else if (ref.subtitle) {
      titleParts.push(ref.subtitle)
    }
  })

  if (operation.grid) {
    titleParts.push(`at ${operation.grid}`)
  }
  console.log('-- titleParts', titleParts)
  return titleParts.join(' ')
}
