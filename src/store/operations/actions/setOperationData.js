/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bandForFrequency } from '@ham2k/lib-operation-data'
import { actions, selectOperation } from '../operationsSlice'
import debounce from 'debounce'
import { saveOperation, saveOperationLocalData } from './operationsDB'
import { findHooks } from '../../../extensions/registry'
import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'

function debounceableDispatch (dispatch, action) {
  return dispatch(action())
}
const debouncedDispatch = debounce(debounceableDispatch, 2000)

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
    return debouncedDispatch(dispatch, () => saveOperationLocalData(savedOperation))
  } catch (e) {
    reportError('Error in setOperationData', e)
  }
}

export const setOperationData = (data) => async (dispatch, getState) => {
  try {
    const { uuid } = data
    const operation = selectOperation(getState(), uuid) ?? {}
    const mergedOperation = await dispatch(mergeDataIntoOperation({ operation, data }))

    await dispatch(actions.setOperation(mergedOperation))
    const savedOperation = selectOperation(getState(), uuid) ?? {}
    return debouncedDispatch(dispatch, () => saveOperation(savedOperation))
  } catch (e) {
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
    }).filter(x => x)

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
      data.subtitle = ''
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
