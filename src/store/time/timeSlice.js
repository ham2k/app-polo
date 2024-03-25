import { createSlice } from '@reduxjs/toolkit'

const INITIAL_STATE = {
  interval: undefined
}

export const timeSlice = createSlice({
  name: 'time',

  initialState: INITIAL_STATE,

  reducers: {
    setValues: (state, action) => {
      for (const key in action.payload) {
        state[key] = action.payload[key]
      }
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
    const tenSeconds = Math.floor(now / 10000) * 10000
    const thirtySeconds = Math.floor(now / 30000) * 30000
    const oneMinute = Math.floor(now / 60000) * 60000
    const fiveMinutes = Math.floor(now / 300000) * 300000
    const values = { now, seconds, tenSeconds, thirtySeconds, oneMinute, fiveMinutes }
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
