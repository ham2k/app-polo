/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Geolocation from '@react-native-community/geolocation'
import { selectSettings } from '../../settings'
import { findBestHook } from '../../../extensions/registry'
import { locationToGrid6, locationToGrid8 } from '@ham2k/lib-maidenhead-grid'
import { setOperationData } from './setOperationData'

export const getOperationTemplate = (operation) => async (dispatch, getState) => {
  const settings = selectSettings(getState())
  const template = {
    stationCall: operation?.stationCall ?? settings.operatorCall,
    operatorCall: operation?.operatorCall,
    allStationCalls: operation?.allStationCalls,
    stationCallPlus: operation?.stationCallPlus,
    stationCallPlusArray: operation?.stationCallPlusArray
  }
  console.log('template', template)

  if (operation.grid) {
    template.grid = true
  }

  const includedRefTypes = {}
  template.refs = []
  for (const ref of (operation?.refs ?? [])) {
    if (includedRefTypes[ref.type]) continue

    includedRefTypes[ref.type] = true

    const hook = findBestHook(`ref:${ref.type}`)
    if (hook?.extractTemplate) {
      try {
        // Let the hook decide how to clone the ref
        template.refs.push(hook.extractTemplate({ ref, operation }))
      } catch (error) {
        console.error('Error cloning ref', error)
      }
    } else if (ref.ref) {
      // Activities that use `ref` tend to also store more information that should not be cloned
      // so we default to just cloning the type
      template.refs.push({ type: ref.type })
    } else {
      // Other activities we probably want to default to copying all the data
      template.refs.push({ ...ref, ref: undefined })
    }
  }

  return template
}

export const fillOperationFromTemplate = (operation, template) => async (dispatch, getState) => {
  const uuid = operation.uuid

  const settings = selectSettings(getState())
  const updates = {}
  console.log('Filing template', template)
  updates.stationCall = template.stationCall ?? settings.operatorCall
  updates.operatorCall = template.operatorCall
  if (template.allStationCalls) updates.allStationCalls = template.allStationCalls
  if (template.stationCallPlus) updates.stationCallPlus = template.stationCallPlus
  if (template.stationCallPlusArray) updates.stationCallPlusArray = template.stationCallPlusArray
  dispatch(setOperationData({ uuid, ...updates }))
  operation = { ...operation, ...updates }
  console.log('Filled operation, callsigns', operation)

  if (template.grid) {
    operation.grid = await new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        info => {
          const { latitude, longitude } = info.coords
          if (settings?.useGrid8) resolve(locationToGrid8(latitude, longitude))
          else resolve(locationToGrid6(latitude, longitude))
        },
        error => {
          console.info('Geolocation error', error)
          resolve()
        }, {
          enableHighAccuracy: true,
          timeout: 5 * 1000 /* 5 seconds */,
          maximumAge: 1000 * 60 * 5 /* 5 minutes */
        }
      )
    })
    dispatch(setOperationData({ uuid, grid: operation.grid }))
    console.log('Filled operation, grid', operation.grid)
  }

  const includedRefTypes = {}
  for (const ref of (template.refs ?? [])) {
    if (includedRefTypes[ref.type]) continue

    includedRefTypes[ref.type] = true

    const hook = findBestHook(`ref:${ref.type}`)
    let newRef
    if (hook?.updateFromTemplateWithDispatch) {
      try {
        // Let the hook decide how to clone the ref
        newRef = await dispatch(hook.updateFromTemplateWithDispatch({ ref, operation }))
      } catch (error) {
        console.error('Error cloning ref', error)
      }
    } else if (hook?.updateFromTemplate) {
      try {
        // Let the hook decide how to clone the ref
        newRef = hook.updateFromTemplate({ ref, operation })
      } catch (error) {
        console.error('Error cloning ref', error)
      }
    } else if (ref.ref) {
      // Activities that use `ref` tend to also store more information
      // so we default to just cloning the type
      newRef = { type: ref.type }
    } else {
      // Other activities we probably want to default to copying all the data
      newRef = { ...ref, ref: undefined }
    }
    operation.refs.push(newRef)
    dispatch(setOperationData({ uuid, refs: operation.refs }))
    console.log('Filled operation, ref', ref)
  }
  console.log('Template operation final', operation)
}
