/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
}

const DEBUG = false

export const uiSlice = createSlice({
  name: 'ui',

  initialState,

  reducers: {
    setStateForComponent: (state, action) => {
      if (DEBUG) console.log('setStateForComponent', action.payload)
      const { component, ...data } = action.payload
      state[component] = data

      if (DEBUG) console.log('setStateForComponent', state[component])
    },
    updateStateForComponent: (state, action) => {
      if (DEBUG) console.log('updateStateForComponent', action.payload)
      const { component, ...data } = action.payload
      state[component] = state[component] || {}
      deepMergeState(state[component], data)

      if (DEBUG) console.log('updateStateForComponent', state[component])
    }
  }
})

function deepMergeState (state, data, visited = undefined) {
  visited = visited || new Set()
  visited.add(data)

  // Then merge keys, recursively
  for (const key of Object.keys(data || {})) {
    const value = data[key]
    if (typeof value === 'object' && !Array.isArray(value) && !visited.has(value)) {
      if (Object.keys(value || {}).length === 0) {
        state[key] = {}
      } else {
        state[key] = state[key] || {}
        deepMergeState(state[key], value)
      }
    } else {
      state[key] = value
    }
  }
}

export const { actions } = uiSlice
export const { setStateForComponent, updateStateForComponent } = uiSlice.actions

export const selectStateForComponent = createSelector(
  (state, component) => state?.ui,
  (state, component) => component,
  (ui, component) => ui?.[component]
)

export default uiSlice.reducer
