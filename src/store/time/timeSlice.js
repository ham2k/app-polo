import { createSlice } from '@reduxjs/toolkit'

const INITIAL_STATE = {
  now: undefined,
  interval: undefined
}

export const timeSlice = createSlice({
  name: 'time',

  initialState: INITIAL_STATE,

  reducers: {
    setValues: (state, action) => {
      state = { ...state, ...action.payload }
    },
    saveInterval: (state, action) => {
      state.interval = action.payload
    }
  }

})

export const { actions } = timeSlice

export const startTickTock = () => (dispatch, getState) => {
  let { interval } = getState().time
  if (interval) return
  interval = setInterval(() => {
    const now = Date.now()
    const seconds = Math.floor(now / 1000) * 1000
    const values = { now, seconds }
    if ((seconds / 1000) % 10 === 0) values.tenSeconds = seconds
    if ((seconds / 1000) % 30 === 0) values.thirtySeconds = seconds
    if ((seconds / 1000) % 60 === 0) values.oneMinute = seconds
    if ((seconds / 1000) % 300 === 0) values.fiveMinutes = seconds
    dispatch(actions.setValues(values))
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

export const selectSecondsTick = (state) => {
  return state?.time?.seconds
}

export const selectTenSecondsTick = (state) => {
  return state?.time?.tenSeconds
}

export const selectThirtySecondsTick = (state) => {
  return state?.time?.thirtySeconds
}

export const selectOneMinuteTick = (state) => {
  return state?.time?.oneMinute
}

export const selectFiveMinutesTick = (state) => {
  return state?.time?.fiveMinutes
}

export default timeSlice.reducer
