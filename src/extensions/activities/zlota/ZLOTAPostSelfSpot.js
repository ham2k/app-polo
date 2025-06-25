/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { reportError } from '../../../distro'

import { filterRefs } from '../../../tools/refTools'
import { apiZLOTA } from '../../../store/apis/apiZLOTA'
import { Info } from './ZLOTAInfo'

export const ZLOTAPostSelfSpot = ({ operation, vfo, comments }) => async (dispatch, getState) => {
  const state = getState()
  const activatorCallsign = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, Info.activationType)
  if (refs.length > 0) {
    const spot = {
      spotter: activatorCallsign,
      activator: activatorCallsign,
      reference: refs.map(ref => ref.ref).join(','),
      frequency: vfo.freq,
      mode: vfo.mode || null,
      comments
    }

    try {
      const apiPromise = await dispatch(apiZLOTA.endpoints.spot.initiate(spot), { forceRefetch: true })
      await Promise.all(dispatch(apiZLOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, _getState) => apiZLOTA.endpoints.spot.select(spot)(_getState()))
      apiPromise.unsubscribe && apiPromise.unsubscribe()

      // Ignore timeout as this seems to happen, despite successful spot???
      if (!apiResults?.data?.success && apiResults?.error?.status !== 'TIMEOUT_ERROR') {
        Alert.alert('Error posting ZLOTA spot', apiResults?.data?.message)
        return false
      }
    } catch (error) {
      Alert.alert('Error posting ZLOTA spot', error.message)
      reportError('Error posting ZLOTA spot', error)
    }
    return true
  }
}
