/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { addEventListener } from '@react-native-community/netinfo'
import { actions } from '../runtimeSlice'

let unsubscribe

export const setupOnlineStatusMonitoring = () => (dispatch) => {
  unsubscribe = addEventListener(state => {
    if (state.isConnected) {
      dispatch(actions.setOnline(state.isInternetReachable === null ? true : state.isInternetReachable))
    } else {
      dispatch(actions.setOnline(false))
    }
  })
}

export const shutdownOnlineStatusMonitoring = () => (dispatch) => {
  if (unsubscribe) {
    unsubscribe()
  }
}
