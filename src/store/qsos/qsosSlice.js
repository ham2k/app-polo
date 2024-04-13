import { createSelector, createSlice } from '@reduxjs/toolkit'

import { qsoKey } from '@ham2k/lib-qson-tools'

const INITIAL_STATE = {
  status: 'ready',
  keys: {},
  qsos: {}
}

export const qsosSlice = createSlice({
  name: 'qsos',

  initialState: INITIAL_STATE,

  reducers: {
    setQSOsStatus: (state, action) => {
      state.status = action.payload
    },
    setQSOs: (state, action) => {
      action.payload.qsos.forEach((qso, index) => { qso._number = index + 1 })

      state.qsos[action.payload.uuid] = action.payload.qsos
      state.keys[action.payload.uuid] = {}
      action.payload.qsos.forEach(qso => { state.keys[action.payload.uuid][qso.key] = qso })
    },
    addQSO: (state, action) => {
      if (!state.qsos[action.payload.uuid]) state.qsos[action.payload.uuid] = []
      if (!state.keys[action.payload.uuid]) state.keys[action.payload.uuid] = {}
      const qsos = state.qsos[action.payload.uuid]
      const keys = state.keys[action.payload.uuid]

      const qso = action.payload.qso
      if (!qso.key) qso.key = qsoKey(qso)

      if (keys[qso._originalKey ?? qso.key]) {
        // Find old QSO and replace it with the new one
        const pos = qsos.findIndex(q => q.key === (qso._originalKey ?? qso.key))
        qsos[pos] = qso
        if (qso._originalKey) {
          delete keys[qso._originalKey]
          delete qso._originalKey
        }
        keys[qso.key] = qso
      } else {
        // Add new QSO to the end of the array
        keys[qso.key] = qso
        qsos[qsos.length] = qso
      }
      state.qsos[action.payload.uuid] = qsos.sort((a, b) => a.startOnMillis - b.startOnMillis).map((q, index) => { q._number = index + 1; return q })
    },
    deleteQSO: (state, action) => {
    },
    unsetQSOs: (state, action) => {
      state.qsos[action.payload] = undefined
      state.keys[actions.payload] = undefined
      delete state.qsos[action.payload]
      delete state.keys[action.payload]
    }
  }

})

export const { actions } = qsosSlice

export const selectQSOsStatus = (state) => {
  return state?.qsos?.status
}

export const selectQSOs = createSelector(
  [(state, uuid) => state?.qsos?.qsos[uuid]],
  (qsos) => qsos ?? []
)

export default qsosSlice.reducer
