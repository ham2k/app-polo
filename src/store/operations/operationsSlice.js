/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseCallsign } from '@ham2k/lib-callsigns'
import { createSelector, createSlice } from '@reduxjs/toolkit'
import { selectOperatorCall } from '../settings'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

const INITIAL_STATE = {
  status: 'ready',
  info: {},
  keys: {}
}

const OPERATION_INITIAL_STATE = {
  stationCall: '',
  local: {
    operatorCall: '',
    band: undefined,
    freq: undefined,
    mode: 'SSB'
  }
}

export const operationsSlice = createSlice({
  name: 'operations',

  initialState: INITIAL_STATE,

  reducers: {
    setOperationsStatus: (state, action) => {
      state.status = action.payload
    },
    setOperations: (state, action) => {
      state.info = action.payload
    },
    setOperation: (state, action) => {
      state.info[action.payload.uuid] = {
        ...OPERATION_INITIAL_STATE,
        ...state.info[action.payload.uuid],
        ...action.payload
      }
    },
    setOperationLocal: (state, action) => {
      const { uuid, ...localData } = action.payload
      state.info[uuid] = {
        ...OPERATION_INITIAL_STATE,
        ...state.info[uuid],
        local: {
          ...state.info[uuid].local,
          ...localData
        }
      }
    },
    unsetOperation: (state, action) => {
      state.info[action.payload] = undefined
      delete state.info[action.payload]
    }
  }

})

export const { actions } = operationsSlice

export const selectOperationsStatus = (state) => {
  return state?.operations?.status
}

export const selectAllOperations = (state) => {
  return state?.operations?.info
}

export const selectOperation = createSelector(
  (state, uuid) => state?.operations?.info,
  (state, uuid) => uuid,
  (info, uuid) => info?.[uuid] ?? {}
)

export const selectOperationCall = createSelector(
  (state, uuid) => state?.operations?.info,
  (state, uuid) => uuid,
  (info, uuid) => info?.[uuid]?.stationCall ?? ''
)

export const selectOperationsList = createSelector(
  (state) => state?.operations?.info,
  (info) => {
    return Object.values(info || {}).sort((a, b) => {
      return (b.startAtMillisMax ?? b.createdAtMillis ?? 0) - (a.startAtMillisMax ?? a.createdAtMillis ?? 0)
    })
  }
)

export const selectOperationCallInfo = createSelector(
  (state, uuid) => selectOperationCall(state, uuid),
  (state) => selectOperatorCall(state),
  (operationCall, settingsCall) => {
    let info = {}
    if (operationCall) {
      info = parseCallsign(operationCall)
      info._source = 'operation'
    } else if (settingsCall) {
      info = parseCallsign(settingsCall)
      info._source = 'settings'
    } else {
      info._source = 'none'
    }
    if (info.baseCall) {
      info = annotateFromCountryFile(info)
      if (info.entityPrefix) {
        info = { ...info, ...DXCC_BY_PREFIX[info?.entityPrefix] }
      }
    }
    return info
  }
)

export default operationsSlice.reducer
