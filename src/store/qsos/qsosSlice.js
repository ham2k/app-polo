/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'

import { qsoKey } from '@ham2k/lib-qson-tools'
import { selectSettings } from '../settings'
import { selectOperation } from '../operations'
import { analizeAndSectionQSOs } from '../../extensions/scoring'

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
        const oldQSO = qsos[pos]
        qsos[pos] = qso
        if (qso._originalKey) {
          delete keys[qso._originalKey]
          delete qso._originalKey
        }
        keys[qso.key] = qso
        if (oldQSO?.startOnMillis !== qso.startOnMillis) {
          qsos.sort((a, b) => a.startOnMillis - b.startOnMillis)
          qsos.forEach((q, index) => {
            if (q._number !== index + 1) q._number = index + 1
          })
        }
      } else {
        // Add new QSO to the end of the array
        keys[qso.key] = qso
        qsos[qsos.length] = qso
        if (qsos.length > 1 && qsos[qsos.length - 2].startOnMillis > qso.startOnMillis) {
          qsos.sort((a, b) => a.startOnMillis - b.startOnMillis)
          qsos.forEach((q, index) => {
            if (q._number !== index + 1) q._number = index + 1
          })
        } else {
          qso._number = qsos.length
        }
      }
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

const EMPTY_QSOS = []
export const selectQSOs = createSelector(
  (state, uuid) => state?.qsos?.qsos?.[uuid],
  (qsos) => qsos ?? EMPTY_QSOS
)

export const selectSectionedQSOs = createSelector(
  (state, uuid) => selectQSOs(state, uuid),
  (state, uuid) => selectSettings(state),
  (state, uuid) => selectOperation(state, uuid),
  (qsos, settings, operation) => analizeAndSectionQSOs({ qsos, settings, operation })
)

export default qsosSlice.reducer
