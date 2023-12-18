import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  call: 'N0CALL',
  onboarded: false,
  accounts: {}
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
    },
    setAccountInfo: (state, action) => {
      state.accounts = state.accounts || {}
      Object.keys(action.payload || {}).forEach(account => {
        state.accounts[account] = { ...state.accounts[account] || {}, ...action.payload[account] || {} }
      })
    }
  }
})

export const { setCall, setOnboarded, setAccountInfo } = settingsSlice.actions

export const selectSettings = (state) => {
  return state?.settings
}

export const selectCall = (state) => {
  return state?.settings?.call || ''
}

export default settingsSlice.reducer
