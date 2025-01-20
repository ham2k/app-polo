/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'
import UUID from 'react-native-uuid'

const initialState = {
  flags: {},
  accounts: {},
  notices: []
}

export const systemSlice = createSlice({
  name: 'system',

  initialState,

  reducers: {
    setSystemFlag: (state, action) => {
      state.flags = state.flags || {}
      Object.keys(action.payload || {}).forEach(key => {
        state.flags[key] = action.payload[key]
      })
    },
    setAccountInfo: (state, action) => {
      state.accounts = state.accounts || {}
      Object.keys(action.payload || {}).forEach(account => {
        state.accounts[account] = { ...state.accounts[account] || {}, ...action.payload[account] || {} }
      })
    },
    addNotice: (state, action) => {
      state.notices = state.notices || []
      action.payload.key = action.payload.key || UUID.v4()
      action.payload.timestamp = action.payload.timestamp || new Date().valueOf

      state.notices = state.notices.filter(notice => notice.key !== action.payload.key)
      state.notices.push(action.payload)
    },
    dismissNotice: (state, action) => {
      state.notices = state.notices || []
      state.notices = state.notices.filter(notice => notice.key !== action.payload.key)
    }
  }
})

export const { actions } = systemSlice
export const { addNotice, dismissNotice } = systemSlice.actions

export const setSystemFlag = (flag, value) => (dispatch) => {
  dispatch(actions.setSystemFlag({ [flag]: value }))
}

export const selectSystemFlag = createSelector(
  (state, flag, defaultValue) => state?.system?.flags || {},
  (_state, flag, _defaultValue) => flag,
  (_state, _flag, defaultValue) => defaultValue,
  (flags, flag, defaultValue) => flags[flag] ?? defaultValue
)

export const selectNotices = (state) => state?.system?.notices ?? []

export default systemSlice.reducer
