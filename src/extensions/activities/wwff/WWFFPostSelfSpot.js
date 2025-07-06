/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { findRef } from '../../../tools/refTools'
import { apiWWFF } from '../../../store/apis/apiWWFF'
import { reportError } from '../../../distro'

export const WWFFPostSelfSpot = ({ operation, vfo, comments }) => async (dispatch, getState) => {
  const state = getState()
  const activatorCallsign = operation.stationCall || state.settings.operatorCall
  const ref = findRef(operation, 'wwffActivation')

  if (ref && ref.ref) {
    const spot = {
      activator: activatorCallsign,
      frequency_khz: vfo.freq,
      mode: vfo.mode,
      reference: ref.ref,
      remarks: comments,
      spotter: activatorCallsign
    }

    try {
      const apiPromise = await dispatch(apiWWFF.endpoints.spot.initiate(spot, { forceRefetch: true }))
      await Promise.all(dispatch(apiWWFF.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, _getState) => apiWWFF.endpoints.spot.select(spot)(_getState()))
      apiPromise.unsubscribe && apiPromise.unsubscribe()
      if (apiResults?.error) {
        Alert.alert('Error posting WWFF spot', `Server responded with status ${apiResults.error?.status} ${apiResults.error?.data?.error}`)
        return false
      }
    } catch (error) {
      Alert.alert('Error posting WWFF spot', error.message)
      reportError('Error posting WWFF spot', error)
      return false
    }
    return true
  }
}
