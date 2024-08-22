/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  online: null,
  flags: {},
  messages: []
}

export const runtimeSlice = createSlice({
  name: 'runtime',

  initialState,

  reducers: {
    setOnline: (state, action) => {
      state.online = action.payload
    },
    resetRuntimeMessages: (state) => {
      state.messages = []
    },
    addRuntimeMessage: (state, action) => {
      state.messages = [...(state.messages || []).slice(0, 998), { time: new Date(), message: action.payload }]
    }
  }
})

export const { actions } = runtimeSlice
export const { addRuntimeMessage, resetRuntimeMessages } = runtimeSlice.actions

export const selectRuntimeOnline = (state) => state?.runtime?.online

export const selectRuntimeMessages = (state) => state?.runtime?.messages ?? []

export default runtimeSlice.reducer
