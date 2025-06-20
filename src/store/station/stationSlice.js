/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSelector, createSlice } from '@reduxjs/toolkit'
import { bandForFrequency } from '@ham2k/lib-operation-data'

const initialState = {
  devices: {},
  currentTransceiver: 'default'
}

export const stationSlice = createSlice({
  name: 'station',

  initialState,

  reducers: {
    setTransceiverState: (state, action) => {
      let { name, ...data } = action.payload
      name = name ?? state.currentTransceiver ?? 'default'
      if (!state.devices) {
        state.devices = state.transceivers || {}
      }

      state.devices[name] = { ...state.devices[name], ...data }
    },
    setVFO: (state, action) => {
      let { name, ...data } = action.payload
      name = name ?? state.currentTransceiver ?? 'default'
      if (data.freq) data.band = bandForFrequency(data.freq)
      let mode
      if (!state.devices) {
        state.devices = state.transceivers || {}
      }
      state.devices[name] = state.devices[name] || {}
      state.devices[name].vfo = state.devices[name].vfo || {}
      mode = state.devices[name].vfo.mode

      if (mode === 'USB') {
        if (data.band === '160m' || data.band === '80m' || data.band === '40m') {
          data.mode = 'LSB'
        }
      } else if (mode === 'LSB') {
        if (data.band !== '160m' && data.band !== '80m' && data.band !== '40m') {
          data.mode = 'USB'
        }
      }
      state.devices[name].vfo = { ...state.devices[name].vfo, ...data }
    },
    setCurrentTransceiver: (state, action) => {
      state.currentTransceiver = action.payload
    }
  }
})

export const { setTransceiverState, setCurrentTransceiver, setVFO } = stationSlice.actions

export const selectTransceiver = createSelector(
  (state) => state?.station?.devices || state?.station?.transceivers,
  (state, transceiver) => transceiver || state?.station?.currentTransceiver || 'default',
  (devices, name) => (devices && devices[name]) ?? {}
)

export const selectVFO = createSelector(
  (state, transceiver) => selectTransceiver(state, transceiver),
  (transceiver) => transceiver.vfo || { band: '20m', mode: 'USB' }
)

export default stationSlice.reducer
