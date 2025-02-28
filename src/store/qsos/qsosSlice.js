/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'

import { selectSettings } from '../settings'
import { selectOperation } from '../operations'
import { analyzeAndSectionQSOs } from '../../extensions/scoring'

const INITIAL_STATE = {
  status: 'ready',
  qsos: {},
  byUUID: {}
}

export const qsosSlice = createSlice({
  name: 'qsos',

  initialState: INITIAL_STATE,

  reducers: {
    setQSOsStatus: (state, action) => {
      state.status = action.payload
    },
    setQSOs: (state, action) => {
      state.qsos[action.payload.uuid] = action.payload.qsos
      state.byUUID[action.payload.uuid] = {}
      action.payload.qsos.forEach(qso => { state.byUUID[action.payload.uuid][qso.uuid] = qso })
    },
    addQSO: (state, action) => {
      if (!state.qsos[action.payload.uuid]) state.qsos[action.payload.uuid] = []
      if (!state.byUUID[action.payload.uuid]) state.byUUID[action.payload.uuid] = {}
      const qsos = state.qsos[action.payload.uuid]
      const byUUID = state.byUUID[action.payload.uuid]

      const qso = action.payload.qso

      if (byUUID[qso.uuid]) {
        // Find old QSO and replace it with the new one
        const pos = qsos.findIndex(q => q.uuid === qso.uuid)
        const oldQSO = qsos[pos]
        qsos[pos] = qso
        byUUID[qso.uuid] = qso
        if (oldQSO?.startAtMillis !== qso.startAtMillis) {
          qsos.sort((a, b) => a.startAtMillis - b.startAtMillis)
        }
      } else {
        // Add new QSO to the end of the array
        byUUID[qso.uuid] = qso
        qsos[qsos.length] = qso
        if (qsos.length > 1 && qsos[qsos.length - 2].startAtMillis > qso.startAtMillis) {
          qsos.sort((a, b) => a.startAtMillis - b.startAtMillis)
        }
      }
    },
    deleteQSO: (state, action) => {
    },
    unsetQSOs: (state, action) => {
      state.qsos[action.payload] = undefined
      state.byUUID[actions.payload] = undefined
      delete state.qsos[action.payload]
      delete state.byUUID[action.payload]
    }
  }

})

export const { actions } = qsosSlice

export const selectQSOsStatus = (state) => {
  return state?.qsos?.status
}

const EMPTY_QSOS = []
export const selectQSOs = createSelector(
  (state, uuid) => state?.qsos?.qsos,
  (state, uuid) => uuid,
  (qsos, uuid) => qsos[uuid] ?? EMPTY_QSOS
)

export const selectSectionedQSOs = createSelector(
  (state, uuid, showDeletedQSOs) => {
    return selectQSOs(state, uuid)
  },
  (state, uuid, showDeletedQSOs) => selectSettings(state),
  (state, uuid, showDeletedQSOs) => selectOperation(state, uuid),
  (state, uuid, showDeletedQSOs) => showDeletedQSOs,
  (qsos, settings, operation, showDeletedQSOs) => analyzeAndSectionQSOs({ qsos, settings, operation, showDeletedQSOs })
)

export default qsosSlice.reducer
