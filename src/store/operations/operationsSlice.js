import { createSelector, createSlice } from '@reduxjs/toolkit'

import { qsoKey } from '@ham2k/lib-qson-tools'

const INITIAL_STATE = {
  status: 'ready',
  info: {},
  keys: {},
  qsos: []
}

const OPERATION_INITIAL_STATE = {
  call: '',
  operator: '',
  station: '',
  position: '',
  grid: '',
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
      state.qsos = {}
    },
    setOperationInfo: (state, action) => {
      state.info[action.payload.uuid] = { ...OPERATION_INITIAL_STATE, ...state.info[action.payload.uuid], ...action.payload }
    },
    setOperationQSOs: (state, action) => {
      state.qsos[action.payload.uuid] = action.payload.qsos
    },
    addOperationQSO: (state, action) => {
      console.log(action)
      if (!state.qsos[action.payload.uuid]) state.qsos[action.payload.uuid] = []
      if (!state.keys[action.payload.uuid]) state.keys[action.payload.uuid] = {}
      const qsos = state.qsos[action.payload.uuid]
      const keys = state.keys[action.payload.uuid]

      const qso = action.payload.qso
      if (!qso.key) qso.key = qsoKey(qso)

      if (keys[qso.key]) {
        // Find old QSO and replace it with the new one
        const pos = qsos.findIndex(q => q.key === qso.key)
        qsos[pos] = qso
        keys[qso.key] = qso
      } else {
        // Add new QSO to the end of the array
        keys[qso.uuid] = qso
        qsos[qsos.length] = qso
      }
    },
    deleteOperationInfo: (state, action) => {
      state.info.delete(action.payload.uuid)
    },
    deleteOperationQSOs: (state, action) => {
      state.qsos.delete(action.payload.uuid)
    }
  }

})

export const { setOperationsStatus, setOperations, setOperationInfo, addOperationQSO, deleteOperationInfo, setOperationQSOs } = operationsSlice.actions

export const selectOperationsStatus = (state) => {
  return state?.operations?.status
}

export const selectOperationInfo = (uuid) => createSelector(
  (state) => state?.operations?.info[uuid],
  (info) => info ?? {}
)

export const selectOperationQSOs = (uuid) => createSelector(
  (state) => state?.operations?.qsos[uuid],
  (qsos) => qsos ?? []
)

export const selectOperationsList = createSelector(
  (state) => state?.operations?.info,
  (info) => {
    return Object.values(info || {}).sort((a, b) => {
      return a.uuid.localeCompare(b.uuid)
    })
  }
)

export default operationsSlice.reducer
