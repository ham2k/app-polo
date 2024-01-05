import { createSelector, createSlice } from '@reduxjs/toolkit'

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

export const selectOperation = (uuid) => createSelector(
  (state) => state?.operations?.info[uuid],
  (info) => info ?? {}
)

export const selectOperationsList = createSelector(
  (state) => state?.operations?.info,
  (info) => {
    return Object.values(info || {}).sort((a, b) => {
      return (b.startOnMillisMax ?? b.createdOnMillis ?? 0) - (a.startOnMillisMax ?? a.createdOnMillis ?? 0)
    })
  }
)

export default operationsSlice.reducer
