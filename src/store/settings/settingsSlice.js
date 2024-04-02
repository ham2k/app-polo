import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile, useBuiltinCountryFile } from '@ham2k/lib-country-files'
import { createSelector, createSlice } from '@reduxjs/toolkit'
import { Platform } from 'react-native'

// eslint-disable-next-line react-hooks/rules-of-hooks
useBuiltinCountryFile()

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
    },
    setExtensionSettings: (state, action) => {
      const { key, ...rest } = action.payload.key
      state.extensions = state.extensions || {}
      state.extensions[key] = { ...state.extensions[key] || {}, ...rest }
    }
  }
})

export const { setOperatorCall, setOnboarded, setAccountInfo, setSettings, setExtensionSettings } = settingsSlice.actions

export const selectSettings = createSelector(
  [(state) => state?.settings],
  (settings) => {
    settings = settings || {}
    if (settings.showNumbersRow === undefined) {
      settings.showNumbersRow = Platform.OS === 'ios'
    }

    let info = {}
    if (settings?.operatorCall) {
      info = parseCallsign(settings.operatorCall)
      if (info.baseCall) {
        info = annotateFromCountryFile(info)
      }
    }

    if (settings.showStateField === undefined && info?.entityPrefix) {
      if (info.entityPrefix.startsWith('K') || info.entityPrefix.startsWith('VE')) {
        settings.showStateField = true
      }
    }

    if (settings.distanceUnits === undefined && info?.entityPrefix) {
      // US, UK, Liberia and Myanmar use miles
      if (info.entityPrefix.startsWith('K') || info.entityPrefix.startsWith('G') || info.entityPrefix.startsWith('EL') || info.entityPrefix.startsWith('XZ')) {
        settings.distanceUnits = 'miles'
      } else {
        settings.distanceUnits = 'km'
      }
    }
    return settings
  }
)

export const selectExtensionSettings = createSelector(
  [
    (state, key) => state?.settings?.extensions,
    (state, key) => key
  ],
  (extensionsSettings, key) => {
    extensionsSettings = extensionsSettings || {}
    return extensionsSettings[key] || {}
  }
)

export const selectOperatorCall = createSelector(
  [(state) => state?.settings?.operatorCall],
  (value) => value === 'N0CALL' ? '' : (value ?? '')
)

export default settingsSlice.reducer
