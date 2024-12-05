/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  extensions: {}
}

export const localSlice = createSlice({
  name: 'local',

  initialState,

  reducers: {
    setLocalData: (state, action) => {
      Object.keys(action.payload || {}).forEach(key => {
        state[key] = action.payload[key]
      })
    },
    setLocalExtensionData: (state, action) => {
      const { key, ...rest } = action.payload
      state.extensions = state.extensions || {}
      state.extensions[key] = { ...state.extensions[key] || {}, ...rest }
    }
  }
})

export const { setLocalData, setLocalExtensionData } = localSlice.actions

export const selectLocalData = createSelector(
  (state) => state?.local,
  (state) => state?.settings,
  (local, settings) => {
    local = { ...local }

    if (settings.showExtraInNumbersRow === undefined) {
      settings.showExtraInNumbersRow = true
    }

    return local
  }
)

export const selectRawLocalData = (state) => state?.local

export const selectLocalExtensionData = createSelector(
  (state, key) => state?.local?.extensions,
  (state, key) => key,
  (extensionsSettings, key) => {
    extensionsSettings = extensionsSettings || {}
    return extensionsSettings[key] || {}
  }
)

export default localSlice.reducer
