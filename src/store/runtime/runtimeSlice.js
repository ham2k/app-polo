import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  online: null,
  flags: {},
  messages: []
}

export const runtimeSlice = createSlice({
  name: 'runtime',

  initialState,

  reducers: {
    setOnline: (state, action) => {
      state.online = action.payload
    },
    resetRuntimeMessages: (state) => {
      state.messages = []
    },
    addRuntimeMessage: (state, action) => {
      state.messages = [...(state.messages || []).slice(0, 998), { time: new Date(), message: action.payload }]
    }
  }
})

export const { actions } = runtimeSlice
export const { addRuntimeMessage, resetRuntimeMessages } = runtimeSlice.actions

export const selectRuntimeOnline = createSelector(
  [(state) => state?.runtime?.online],
  (value) => value
)

export const selectRuntimeMessages = createSelector(
  [(state) => state?.runtime?.messages],
  (value) => value ?? []
)

export default runtimeSlice.reducer
