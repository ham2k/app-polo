// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
    setStateForComponentAndKey: (state, action) => {
      const { component, key, value } = action.payload
      if (DEBUG) console.log('setStateForComponentAndKey called with', component, key, value)
      state[component] = state[component] || {}
      state[component][key] = value
      if (DEBUG) console.log('-- set state to', component, key, state[component][key])
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
    updateStateForComponentAndKey: (state, action) => {
      const { component, key, value, defaultValue } = action.payload
      state[component] = state[component] ?? {}
      state[component][key] = state[component][key] ?? defaultValue
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Only merge objects, not arrays or primitive values
        deepMergeState(state[component][key], value)
      } else {
        state[component][key] = value
      }
    },
    setGlobalDialog: (state, action) => {
      state.globalDialog = { ...state.globalDialog, ...action.payload }
    },
    resetGlobalDialog: (state) => {
      state.globalDialog = {}
    }
  }
})

function deepMergeState (state, data, visited = undefined) {
  visited = visited || new Set()
  visited.add(data)

  // Then merge keys, recursively
  for (const key of Object.keys(data ?? {})) {
    const value = data[key]
    if (typeof value === 'object' && !Array.isArray(value) && !visited.has(value)) {
      if (Object.keys(value ?? {}).length === 0) {
        // If given an explicit empty object, replace, not merge
        state[key] = {}
      } else {
        // Otherwise, merge recursively
        state[key] = state[key] ?? {}
        deepMergeState(state[key], value)
      }
    } else {
      // If the value is not an object, replace it
      state[key] = value
    }
  }
}

export const { actions } = uiSlice
export const {
  setStateForComponent,
  setStateForComponentAndKey,
  updateStateForComponent,
  updateStateForComponentAndKey,
  setGlobalDialog,
  resetGlobalDialog
} = uiSlice.actions

export const selectStateForComponent = createSelector(
  (state, component) => state?.ui,
  (state, component) => component,
  (ui, component) => ui?.[component]
)

export const selectStateForComponentAndKey = createSelector(
  (state, component, key) => state?.ui,
  (state, component, key) => component,
  (state, component, key) => key,
  (ui, component, key) => ui?.[component]?.[key]
)

export const selectGlobalDialog = createSelector(
  (state) => state?.ui,
  (ui) => ui?.globalDialog
)

export default uiSlice.reducer
