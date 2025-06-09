/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { reportError } from '../../../distro'

import { setOperationData } from '../../../store/operations'
import { filterRefs } from '../../../tools/refTools'
import { apiWWBOTA } from '../../../store/apis/apiWWBOTA'
import { Info } from './WWBOTAInfo'

export const WWBOTAPostSelfSpot = ({ operation, vfo, comments }) => async (dispatch, getState) => {
  const state = getState()
  const activatorCallsign = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, Info.activationType)
  if (refs.length) {
    const schemeRefs = {}
    refs.forEach((ref) => {
      const [scheme, num] = ref.ref.split('-')
      if (!schemeRefs[scheme]) {
        schemeRefs[scheme] = []
      }
      schemeRefs[scheme].push(num)
    })

    const comment = [
      Object.entries(schemeRefs).map(([scheme, nums]) => `${scheme}-${nums.join(',')}`).join(' '),
      operation.wabSquare && `WAB ${operation.wabSquare}`,
      comments
    ].filter(x => x).join(' ')

    const spot = {
      spotter: activatorCallsign,
      call: activatorCallsign,
      freq: vfo.freq / 1000, // MHz
      mode: vfo.mode || null,
      comment,
      type: comments.match(/QRT/i) ? 'QRT' : 'Live' // Also 'Test' when debugging
    }
    try {
      let spotId = operation?.spotIds?.[Info.key]
      if (spotId) {
        const apiPromise = await dispatch(apiWWBOTA.endpoints.editSpot.initiate({ id: spotId, body: spot }, { forceRefetch: true }))
        await Promise.all(dispatch(apiWWBOTA.util.getRunningQueriesThunk()))
        const apiResults = await dispatch((_dispatch, _getState) => apiWWBOTA.endpoints.editSpot.select({ id: spotId, body: spot })(_getState()))
        apiPromise.unsubscribe && apiPromise.unsubscribe()

        if (apiResults?.error?.status === 404) {
          spotId = undefined
        }
      }
      if (!spotId) {
        const apiPromise = await dispatch(apiWWBOTA.endpoints.spot.initiate(spot), { forceRefetch: true })
        await Promise.all(dispatch(apiWWBOTA.util.getRunningQueriesThunk()))
        const apiResults = await dispatch((_dispatch, _getState) => apiWWBOTA.endpoints.spot.select(spot)(_getState()))
        apiPromise.unsubscribe && apiPromise.unsubscribe()

        dispatch(setOperationData({
          uuid: operation.uuid,
          spotIds: { ...operation?.spotIds, [Info.key]: apiResults?.data?.id }
        }))
      }
    } catch (error) {
      Alert.alert('Error posting WWBOTA spot', error.message)
      reportError('Error posting WWBOTA spot', error)
    }
  }
}
