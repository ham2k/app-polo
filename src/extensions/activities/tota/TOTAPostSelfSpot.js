/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { reportError } from '../../../distro'
import GLOBAL from '../../../GLOBAL'

import { findRef } from '../../../tools/refTools'
import { apiTOTA } from '../../../store/apis/apiTOTA'
import { Info } from './TOTAInfo'

export const TOTAPostSelfSpot = ({ t, operation, vfo, comments }) => async (dispatch, getState) => {
  if (GLOBAL?.flags?.services?.tota === false) return false

  const state = getState()

  let activatorCallsign = operation.stationCall || state.settings.operatorCall
  if (operation.local?.isMultiStation) {
    activatorCallsign = `${activatorCallsign}/M${operation.local.multiIdentifier ?? "0"}`
  }

  const ref = findRef(operation, Info.activationType)

  if (ref && ref.ref) {
    const spot = {
      callsign: activatorCallsign,
      frequency: vfo.freq,
      mode: vfo.mode,
      tower_ref: ref.ref,
      comment: comments,
    }

    try {
      const apiPromise = await dispatch(apiTOTA.endpoints.spot.initiate(spot, { forceRefetch: true }))
      await Promise.all(dispatch(apiTOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, _getState) => apiTOTA.endpoints.spot.select(spot)(_getState()))
      apiPromise.unsubscribe && apiPromise.unsubscribe()
      // Don't worry about duplicates
      if (apiResults?.error && !apiResults?.error?.data?.message?.match(/Duplicate self-spot/)) {
        Alert.alert(t('extensions.activities.tota.postSpotAPI.error', 'Error posting TOTA spot'),
          t('extensions.tota.postSpotAPI.serverResponse', 'Server responded with status {{status}} {{message}}', { status: apiResults.error?.status, message: apiResults.error?.data?.message }))
        return false
      }
    } catch (error) {
      Alert.alert(t('extensions.tota.postSpotAPI.error', 'Error posting TOTA spot'), error.message)
      reportError('Error posting TOTA spot', error)
      return false
    }
    return true
  }
}
