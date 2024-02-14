import { createSelector, createSlice } from '@reduxjs/toolkit'

const initialState = {
  operatorCall: 'N0CALL',
  onboarded: false,
  accounts: {},
  flags: {}
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
    },
    setSettings: (state, action) => {
      Object.keys(action.payload || {}).forEach(key => {
        state[key] = action.payload[key]
      })
    }
  }
})

export const { setOperatorCall, setOnboarded, setAccountInfo, setSettings } = settingsSlice.actions

export const selectSettings = createSelector(
  (state) => state?.settings,
  (value) => value ?? {}
)

export const selectOperatorCall = createSelector(
  (state) => state?.settings?.operatorCall,
  (value) => value ?? ''
)

export default settingsSlice.reducer
