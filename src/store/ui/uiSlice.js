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
      const { component, ...data } = action.payload
      if (DEBUG) console.log('setStateForComponent called with', component, data)
      state[component] = data

      if (DEBUG) console.log('-- set state to', component, state[component])
    },
    updateStateForComponent: (state, action) => {
      const { component, ...data } = action.payload
      if (DEBUG) console.log('updateStateForComponent called with', component, data)
      if (DEBUG) console.log('-- current state', component, state[component])
      state[component] = state[component] || {}
      deepMergeState(state[component], data)
      // if (component === 'OpLoggingTab' && data.loggingState?.qso) {
      //   console.log('====================')
      //   console.log('updateStateForComponent', component)
      //   console.log(' -- payload ', { theirCall: data.loggingState.qso?.their?.call, name: data.loggingState.qso?.their?.guess?.name, status: data.loggingState.qso?.their?.lookup?.status, keys: Object.keys(data.loggingState.qso), keysTheir: Object.keys(data.loggingState.qso?.their || {}) })
      //   console.log(' -- state', { theirCall: state[component].loggingState.qso?.their?.call, name: state[component].loggingState.qso?.their?.guess?.name, status: state[component].loggingState.qso?.their?.lookup?.status })
      //   console.log('====================')
      // }
      if (DEBUG) console.log('-- updated state', component, state[component])
    },
    setGlobalDialog: (state, action) => {
      state.globalDialog = { ...state.globalDialog, ...action.payload }
    },
    resetGlobalDialog: (state) => {
      state.globalDialog = {}
    }
  }
})

function deepMergeState(state, data, visited = undefined) {
  visited = visited || new Set()
  visited.add(data)

  // Then merge keys, recursively
  for (const key of Object.keys(data || {})) {
    const value = data[key]
    // Check for _replace marker - if present, replace the entire object instead of merging
    if (value?._replace) {
      const { _replace, ...rest } = value
      state[key] = rest
    } else if (typeof value === 'object' && !Array.isArray(value) && !visited.has(value)) {
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
export const { setStateForComponent, updateStateForComponent, setGlobalDialog, resetGlobalDialog } = uiSlice.actions

export const selectStateForComponent = createSelector(
  (state, component) => state?.ui,
  (state, component) => component,
  (ui, component) => ui?.[component]
)

export const selectGlobalDialog = createSelector(
  (state) => state?.ui,
  (ui) => ui?.globalDialog
)

export default uiSlice.reducer
