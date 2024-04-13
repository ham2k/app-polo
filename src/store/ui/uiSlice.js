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
  Object.keys(data || {}).forEach(key => {
    const value = data[key]
    if (typeof value === 'object' && !Array.isArray(value) && !visited.has(value)) {
      state[key] = state[key] || {}
      deepMergeState(state[key], value)
    } else {
      state[key] = value
    }
  })
}

export const { actions } = uiSlice
export const { setStateForComponent, updateStateForComponent } = uiSlice.actions

export const selectStateForComponent = createSelector(
  [
    (state, component) => state?.ui && state?.ui[component]
  ],
  (value) => value ?? {}
)

export default uiSlice.reducer
