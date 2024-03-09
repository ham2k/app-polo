import { parseCallsign } from '@ham2k/lib-callsigns'
import { createSelector, createSlice } from '@reduxjs/toolkit'
import { selectOperatorCall } from '../settings'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

const INITIAL_STATE = {
  status: 'ready',
  info: {},
  keys: {}
}

const OPERATION_INITIAL_STATE = {
  call: '',
  operator: '',
  station: '',
  position: '',
  grid: '',
  band: undefined,
  freq: undefined,
  mode: 'SSB',
  power: undefined,
  status: 'ready'
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
      state.info[action.payload.uuid] = { ...OPERATION_INITIAL_STATE, ...state.info[action.payload.uuid], ...action.payload }
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

export const selectOperation = createSelector(
  [(state, uuid) => state?.operations?.info[uuid]],
  (info) => info ?? {}
)

export const selectOperationCall = createSelector(
  [(state, uuid) => state?.operations?.info[uuid]],
  (operation) => operation?.stationCall ?? ''
)

export const selectOperationsList = createSelector(
  [(state) => state?.operations?.info],
  (info) => {
    return Object.values(info || {}).sort((a, b) => {
      return (b.startOnMillisMax ?? b.createdOnMillis ?? 0) - (a.startOnMillisMax ?? a.createdOnMillis ?? 0)
    })
  }
)

export const selectOperationCallInfo = createSelector(
  [
    (state, uuid) => selectOperationCall(state, uuid),
    (state) => selectOperatorCall(state)
  ],
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
    }
    return info
  }
)

export default operationsSlice.reducer
