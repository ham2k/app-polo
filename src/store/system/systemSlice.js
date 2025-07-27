/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'
import UUID from 'react-native-uuid'

const initialState = {
  flags: {},
  featureFlags: {},
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
    setFeatureFlags: (state, action) => {
      state.featureFlags = action.payload || {}
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
      if (!action.payload.unique || !state.notices.find(notice => notice.unique === action.payload.unique)) {
        state.notices.push(action.payload)
      }
    },
    dismissNotice: (state, action) => {
      state.notices = state.notices || []

      state.dismissedNotices = state.dismissedNotices || {}
      state.dismissedNotices[action.payload.key] = Date.now()

      state.notices = state.notices.filter(notice => notice.key !== action.payload.key)
      if (action.payload.unique) {
        state.notices = state.notices.filter(notice => notice.unique !== action.payload.unique)
      }
    },
    clearNoticesDismissed: (state) => {
      state.dismissedNotices = {}
    }
  }
})

export const { actions } = systemSlice
export const { addNotice, dismissNotice, clearNoticesDismissed, setFeatureFlags } = systemSlice.actions

export const setSystemFlag = (flag, value) => (dispatch) => {
  dispatch(actions.setSystemFlag({ [flag]: value }))
}

export const selectSystemFlag = createSelector(
  (state, flag, defaultValue) => state?.system?.flags || {},
  (_state, flag, _defaultValue) => flag,
  (_state, _flag, defaultValue) => defaultValue,
  (flags, flag, defaultValue) => flags[flag] ?? defaultValue
)

export const selectNotices = createSelector(
  (state) => state?.system,
  (system) => system.notices ?? []
)

export const selectDismissedNotices = createSelector(
  (state) => state?.system,
  (system) => system.dismissedNotices ?? {}
)

export const selectFeatureFlag = createSelector(
  (state, flag) => state?.system?.featureFlags || {},
  (_state, flag) => flag,
  (featureFlags, flag) => featureFlags[flag]
)

export const selectFeatureFlags = createSelector(
  (state) => state?.system,
  (system) => system.featureFlags ?? {}
)

export default systemSlice.reducer
