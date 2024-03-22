import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { createSelector, createSlice } from '@reduxjs/toolkit'
import { Platform } from 'react-native'

const initialState = {
  operatorCall: '',
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
  [(state) => state?.settings],
  (settings) => {
    settings = settings || {}
    if (settings.showNumbersRow === undefined) {
      settings.showNumbersRow = Platform.OS === 'ios'
    }

    if (settings.showStateField === undefined && settings.operatorCall) {
      let info = parseCallsign(settings.operatorCall)
      if (info.baseCall) {
        info = annotateFromCountryFile(info)
      }
      if (info?.entityPrefix?.startsWith('K') || info?.entityPrefix?.startsWith('VE')) {
        settings.showStateField = true
      }
    }

    return settings
  }
)

export const selectOperatorCall = createSelector(
  [(state) => state?.settings?.operatorCall],
  (value) => value === 'N0CALL' ? '' : (value ?? '')
)

export default settingsSlice.reducer
