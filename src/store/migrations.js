/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const migrations = {
  2: (state) => {
    // We're consolidating ECA and BCA into WCA
    if (state?.settings?.['extensions/bca']) {
      state.settings['extensions/wca'] = true
      delete state.settings['extensions/bca']
    }
    if (state?.settings?.['extensions/eca']) {
      state.settings['extensions/wca'] = true
      delete state.settings['extensions/eca']
    }
    return state
  },
  1: (state) => {
    // settings.call is now settings.operatorCall, and operation.call is now operation.stationCall
    const newState = {
      ...state,
      settings: {
        operatorCall: state?.settings?.call
      }
    }
    Object.keys(newState?.operations?.info || {}).forEach(uuid => {
      newState.operations.info[uuid].stationCall = newState.operations.info[uuid].call
    })
  },

  0: (state) => {
    return state
  }
}

export const LATEST_VERSION = 2
