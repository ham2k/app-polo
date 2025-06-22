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

export const ZLOTAPostOtherSpot = ({ comments, qso, spotterCall }) => async (dispatch, getState) => {
  const refs = filterRefs(qso, Info.activationType)

  if (refs.length > 0) {
    const spot = {
      spotter: qso.our?.call ?? spotterCall,
      activator: qso.their.call,
      reference: refs.map(ref => ref.ref).join(','),
      frequency: qso.freq,
      mode: qso.mode || null,
      comments
    }

    try {
      const apiPromise = await dispatch(apiZLOTA.endpoints.spot.initiate(spot), { forceRefetch: true })
      await Promise.all(dispatch(apiZLOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, _getState) => apiZLOTA.endpoints.spot.select(spot)(_getState()))
      apiPromise.unsubscribe && apiPromise.unsubscribe()

      if (!apiResults?.data?.success) {
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
