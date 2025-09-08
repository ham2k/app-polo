/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { ADIF_SUBMODES } from '@ham2k/lib-operation-data'

import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'

import { findRef } from '../../../tools/refTools'
import { apiSOTA } from '../../../store/apis/apiSOTA'

const validModes = ['AM', 'CW', 'Data', 'DV', 'FM', 'SSB']

export const SOTAPostOtherSpot = ({ comments, qso }) => async (dispatch) => {
  if (GLOBAL?.flags?.services?.sota === false) return false

  const activatorCallsign = qso.their.call

  const ref = findRef(qso, 'sota')
  const [associationCode, summitCode] = ref.ref.split('/', 2)

  let mode = qso.mode
  if (!validModes.includes(mode)) {
    if (ADIF_SUBMODES.SSB.includes(mode)) {
      mode = 'SSB'
    } else if (mode === 'DIGITALVOICE' || ADIF_SUBMODES.DIGITALVOICE.includes(mode)) {
      mode = 'DV'
    } else {
      mode = 'Data' // Reasonable guess
    }
  }

  const spot = {
    associationCode,
    summitCode,
    activatorCallsign,
    frequency: (qso.freq / 1000).toFixed(5).replace(/0?0$/, ''), // string
    mode,
    comments,
    type: comments.match(/QRT/i) ? 'QRT' : 'NORMAL' // Also 'TEST' when debugging
  }

  try {
    const apiPromise = await dispatch(apiSOTA.endpoints.spot.initiate(spot))
    await Promise.all(dispatch(apiSOTA.util.getRunningQueriesThunk()))
    const apiResults = await dispatch((_dispatch, _getState) => apiSOTA.endpoints.spot.select(spot)(_getState()))
    apiPromise.unsubscribe && apiPromise.unsubscribe()

    if (apiResults?.error) {
      if (apiResults.error?.status === 403) { // Forbidden, not logged in
        Alert.alert('Error posting SOTA spot', 'SOTA account logged out. Please log in again in PoLo settings')
      } else {
        Alert.alert('Error posting SOTA spot', `${apiResults.error?.status} ${apiResults.error?.data?.message}`)
      }
      return false
    }
  } catch (error) {
    Alert.alert('Error posting SOTA spot', error.message)
    reportError('Error posting SOTA spot', error)
    return false
  }
  return true
}
