import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  flags: {},
  messages: []
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
    addSystemMessage: (state, action) => {
      state.messages.push({ time: new Date(), message: action.payload })
      while (state.messages.length > 100) state.messages.shift()
    }
  }
})

export const { setSystemFlag, addSystemMessage } = systemSlice.actions

export const selectSystemFlag = (flag, defaultValue) => createSelector(
  (state) => state?.system?.flags || {},
  (flags) => flags[flag] ?? defaultValue
)

export default systemSlice.reducer
