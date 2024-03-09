import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  online: null,
  flags: {},
  messages: []
}

export const systemSlice = createSlice({
  name: 'system',

  initialState,

  reducers: {
    setOnline: (state, action) => {
      state.online = action.payload
    },
    setSystemFlag: (state, action) => {
      state.flags = state.flags || {}
      Object.keys(action.payload || {}).forEach(key => {
        state.flags[key] = action.payload[key]
      })
    },
    addSystemMessage: (state, action) => {
      state.messages = [...(state.messages || []).slice(0, 98), { time: new Date(), message: action.payload }]
    }
  }
})

export const { actions } = systemSlice
export const { setSystemFlag, addSystemMessage } = systemSlice.actions

export const selectSystemFlag = () => createSelector(
  [
    (state, flag, defaultValue) => state?.system?.flags || {},
    (_state, flag, _defaultValue) => flag,
    (_state, _flag, defaultValue) => defaultValue
  ],
  (flags, flag, defaultValue) => flags[flag] ?? defaultValue
)

export const selectSystemOnline = createSelector(
  [(state) => state?.system?.online],
  (value) => value
)

export default systemSlice.reducer
