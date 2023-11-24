import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  call: 'N0CALL',
  onboarded: false
}

export const settingsSlice = createSlice({
  name: 'settings',

  initialState,

  reducers: {
    setCall: (state, action) => {
      state.call = action.payload
    },
    setOnboarded: (state, action) => {
      state.onboarded = action.payload
    }
  }

})

export const { setCall, setOnboarded } = settingsSlice.actions

export const selectSettings = (state) => {
  return state?.settings
}

export const selectCall = (state) => {
  return state?.settings?.call || ''
}

export default settingsSlice.reducer
