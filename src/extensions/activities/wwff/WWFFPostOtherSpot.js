/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'
import { apiWWFF } from '../../../store/apis/apiWWFF'
import { findRef } from '../../../tools/refTools'
import { reportError } from '../../../distro'

export const WWFFPostOtherSpot = ({ comments, qso, spotterCall }) => async (dispatch) => {
  const ref = findRef(qso, 'wwff')

  if (ref && ref.ref) {
    const spot = {
      activator: qso.their.call,
      frequency_khz: qso.freq,
      mode: qso.mode,
      reference: ref.ref,
      remarks: comments,
      spotter: spotterCall
    }

    try {
      const apiPromise = await dispatch(apiWWFF.endpoints.spot.initiate(spot, { forceRefetch: true }))
      await Promise.all(dispatch(apiWWFF.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, _getState) => apiWWFF.endpoints.spot.select(spot)(_getState()))
      apiPromise.unsubscribe && apiPromise.unsubscribe()
      // Don't worry about duplicates
      if (apiResults?.error && !apiResults?.error?.data?.message?.match(/Duplicate spot detected/)) {
        Alert.alert('Error posting WWFF spot', `Server responded with status ${apiResults.error?.status} ${apiResults.error?.data?.message}`)
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
