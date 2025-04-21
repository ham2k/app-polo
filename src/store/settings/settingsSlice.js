/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
      const { key, ...rest } = action.payload
      state.extensions = state.extensions || {}
      state.extensions[key] = { ...state.extensions[key] || {}, ...rest }
    },
    setExportSettings: (state, action) => {
      const { key, ...rest } = action.payload
      state.exports = state.exports || {}
      state.exports[key] = { ...state.exports[key] || {}, ...rest }
    },
    mergeSettings: (state, action) => {
      deepMergeState(state, action.payload)
    }
  }
})

export const { setOperatorCall, setOnboarded, setAccountInfo, setSettings, setExtensionSettings, setExportSettings, mergeSettings } = settingsSlice.actions

function deepMergeState (state, data, visited = undefined) {
  visited = visited || new Set()
  visited.add(data)

  // Then merge keys, recursively
  for (const key of Object.keys(data || {})) {
    const value = data[key]
    if (typeof value === 'object' && !Array.isArray(value) && !visited.has(value)) {
      if (Object.keys(value || {}).length === 0) {
        state[key] = {}
      } else {
        state[key] = state[key] || {}
        deepMergeState(state[key], value)
      }
    } else {
      state[key] = value
    }
  }
}

export const selectSettings = createSelector(
  (state) => state?.settings,
  (settings) => {
    settings = { ...settings }

    if (settings.showNumbersRow === undefined) {
      settings.showNumbersRow = Platform.OS === 'ios'
    }

    if (settings.showExtraInNumbersRow === undefined) {
      settings.showExtraInNumbersRow = true
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

    if (settings.modes === undefined) {
      settings.modes = ['SSB', 'CW', 'FT8', 'FT4', 'FM']
    }

    if (settings.bands === undefined) {
      settings.bands = ['80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m']
    }

    return settings
  }
)

export const selectRawSettings = (state) => state?.settings

export const selectExtensionSettings = createSelector(
  (state, key) => state?.settings?.extensions,
  (state, key) => key,
  (extensionsSettings, key) => {
    extensionsSettings = extensionsSettings || {}
    return extensionsSettings[key] || {}
  }
)

export const selectExportSettings = createSelector(
  (state, key, defaults) => state?.settings?.exports,
  (state, key, defaults) => key,
  (state, key, defaults) => defaults,
  (exportsSettings, key, defaults) => {
    const settings = exportsSettings?.[key] ?? {}
    if (Object.keys(settings).length === 0) return defaults ?? {}
    else return settings
  }
)

export const selectOperatorCall = createSelector(
  (state) => state?.settings,
  (settings) => settings?.operatorCall === 'N0CALL' ? '' : (settings?.operatorCall ?? '')
)

export default settingsSlice.reducer
