/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'

import { findRef } from '../../../tools/refTools'
import { apiPnP } from '../../../store/apis/apiPnP'

import { Info } from './SiOTAInfo'

export const SiOTAPostSelfSpot = ({ operation, vfo, comments }) => async (dispatch, getState) => {
  if (GLOBAL?.flags?.services?.pnp === false) return false

  const state = getState()
  let activatorCallsign = operation.stationCall || state.settings.operatorCall
  if (operation.local.isMultiStation) {
    activatorCallsign = `${activatorCallsign}/M${operation.local.multiIdentifier ?? "0"}`
  }

  const ref = findRef(operation, Info.activationType)
  if (ref) {
    const spot = {
      actCallsign: activatorCallsign,
      actClass: 'SiOTA',
      actSite: ref.ref,
      freq: vfo.freq / 1000, // MHz
      mode: vfo.mode || null,
      comments
    }

    try {
      const apiPromise = await dispatch(apiPnP.endpoints.spot.initiate(spot), { forceRefetch: true })
      await Promise.all(dispatch(apiPnP.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, _getState) => apiPnP.endpoints.spot.select(spot)(_getState()))
      apiPromise.unsubscribe && apiPromise.unsubscribe()

      if (apiResults?.error || apiResults?.data?.match(/Failure/)) {
        Alert.alert('Error posting SiOTA spot', apiResults?.error ? apiResults.error?.error : apiResults?.data)
        return false
      }
    } catch (error) {
      Alert.alert('Error posting SiOTA spot', error.message)
      reportError('Error posting SiOTA spot', error)
    }
    return true
  }
}
