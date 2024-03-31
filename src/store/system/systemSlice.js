import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  flags: {}
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
