import { createSelector, createSlice } from '@reduxjs/toolkit'

const INITIAL_STATE = {
  status: 'ready',
  info: {},
  qsos: {}
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
      if (!state.qsos[action.payload.id]) state.qsos[action.payload.id] = { keys: {}, qsos: [] }
      if (state.qsos[action.payload.id].keys[action.payload.qso.key]) {
        // Find old QSO and replace it with the new one
        const pos = state.qsos[action.payload.id].qsos.findIndex(qso => qso.key === action.payload.qso.key)
        state.qsos[action.payload.id].qsos[pos] = action.payload.qso
        state.qsos[action.payload.id].keys[action.payload.qso.key] = action.payload.qso
      } else {
        // Add new QSO to the end of the array
        state.qsos[action.payload.id].keys[action.payload.qso.id] = action.payload.qso
        state.qsos[action.payload.id].qsos.push(action.payload.qso)
      }
      state.qsos[action.payload.id] = { ...OPERATION_INITIAL_STATE, ...state.info[action.payload.id], ...action.payload }
    },
    deleteOperationInfo: (state, action) => {
      state.info.delete(action.payload.id)
    },
    deleteOperationQSOs: (state, action) => {
      state.qsos.delete(action.payload.id)
    }
  }

})

export const { setOperationsStatus, setOperations, setOperationInfo, deleteOperationInfo, setOperationQSOs } = operationsSlice.actions

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
