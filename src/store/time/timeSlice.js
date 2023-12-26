import { createSelector, createSlice } from '@reduxjs/toolkit'

const INITIAL_STATE = {
  now: undefined,
  interval: undefined
}

export const timeSlice = createSlice({
  name: 'time',

  initialState: INITIAL_STATE,

  reducers: {
    setNow: (state, action) => {
      state.now = action.payload || Date.now()
    },
    saveInterval: (state, action) => {
      state.interval = action.payload
    }
  }

})

export const { actions } = timeSlice

export const startTickTock = () => (dispatch, getState) => {
  let { interval } = getState().time
  console.log('Starting tick tock?')
  if (interval) return
  console.log('Starting tick tock!')
  interval = setInterval(() => {
    dispatch(actions.setNow())
  }, 1000)
  actions.saveInterval(interval)
}

export const stopTickTock = () => (dispatch, getState) => {
  const { interval } = getState().time
  if (!interval) return
  clearInterval(interval)
  actions.saveInterval(undefined)
}

export const selectNow = (state) => {
  return state?.time?.now
}

export const selectQSOs = (uuid) => createSelector(
  (state) => state?.qsos?.qsos[uuid],
  (qsos) => qsos ?? []
)

export default timeSlice.reducer
