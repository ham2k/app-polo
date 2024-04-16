/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  flags: {},
  accounts: {}
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
    }
  }
})

export const { actions } = systemSlice

export const setSystemFlag = (flag, value) => (dispatch) => {
  dispatch(actions.setSystemFlag({ [flag]: value }))
}

export const selectSystemFlag = createSelector(
  [
    (state, flag, defaultValue) => state?.system?.flags || {},
    (_state, flag, _defaultValue) => flag,
    (_state, _flag, defaultValue) => defaultValue
  ],
  (flags, flag, defaultValue) => flags[flag] ?? defaultValue
)

export default systemSlice.reducer
