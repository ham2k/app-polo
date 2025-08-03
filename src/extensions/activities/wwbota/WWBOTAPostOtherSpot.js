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

import { filterRefs } from '../../../tools/refTools'
import { apiWWBOTA } from '../../../store/apis/apiWWBOTA'

import { Info } from './WWBOTAInfo'

export const WWBOTAPostOtherSpot = ({ comments, qso, spotterCall }) => async (dispatch) => {
  if (GLOBAL?.flags?.services?.wwbota === false) return false

  const refs = filterRefs(qso, Info.huntingType)

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
    qso.wabSquare && `WAB ${qso.wabSquare}`,
    comments
  ].filter(x => x).join(' ')

  const spot = {
    spotter: qso.our?.call ?? spotterCall,
    call: qso.their.call,
    freq: qso.freq / 1000, // MHz
    mode: qso.mode || null,
    comment,
    type: comments.match(/QRT/i) ? 'QRT' : 'Live' // Also 'Test' when debugging
  }
  try {
    const apiPromise = await dispatch(apiWWBOTA.endpoints.spot.initiate(spot), { forceRefetch: true })
    await Promise.all(dispatch(apiWWBOTA.util.getRunningQueriesThunk()))
    await dispatch((_dispatch, _getState) => apiWWBOTA.endpoints.spot.select(spot)(_getState()))
    apiPromise.unsubscribe && apiPromise.unsubscribe()
  } catch (error) {
    Alert.alert('Error posting WWBOTA spot', error.message)
    reportError('Error posting WWBOTA spot', error)
  }
}
