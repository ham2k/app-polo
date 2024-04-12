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
      state[component] = state[component] || {}
      Object.keys(data || {}).forEach(key => {
        state[component][key] = data[key]
      })
      if (DEBUG) console.log('setStateForComponent', state[component])
    }
  }
})

export const { actions } = uiSlice
export const { setStateForComponent } = uiSlice.actions

export const selectStateForComponent = createSelector(
  [
    (state, component) => state?.ui && state?.ui[component]
  ],
  (value) => value ?? {}
)

export default uiSlice.reducer
