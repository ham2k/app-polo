import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  operatorCall: 'N0CALL',
  onboarded: false,
  accounts: {}
}

export const settingsSlice = createSlice({
  name: 'settings',

  initialState,

  reducers: {
    setOperatorCall: (state, action) => {
      state.operatorCall = action.payload
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

export const { setOperatorCall, setOnboarded, setAccountInfo } = settingsSlice.actions

export const selectSettings = (state) => {
  return state?.settings
}

export const selectOperatorCall = (state) => {
  return state?.settings?.operatorCall || ''
}

export default settingsSlice.reducer
