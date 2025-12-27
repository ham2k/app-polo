/*
 * Copyright ©️ 2024 Aldo Mendoza <NA7DO>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { findRef } from '../../../tools/refTools'
import { Info } from './POTAInfo'
import { apiPOTA } from '../../../store/apis/apiPOTA'

const confirmationName = 'potaSpots'

export const ConfirmFromSpotsHook = {
  ...Info,
  confirmationName,

  fetchConfirmation: (qso) => {
    const potaSpot = qso?.qsl && qso.qsl[confirmationName]
    if (!potaSpot || !potaSpot.spot) {
      return
    }

    return {
      title: 'POTA Spot',
      note: potaSpot.spot.comments,
      call: potaSpot.spot.spotter,
      isGuess: potaSpot.isGuess
    }
  },

  fetchSpots: async ({ operation, dispatch }) => {
    if (!operation.stationCall) {
      return
    }

    const park = findRef(operation, 'potaActivation')?.ref
    if (!park) {
      return
    }

    const args = { call: operation.stationCall, park }
    const apiPromise = await dispatch(apiPOTA.endpoints.spotComments.initiate(args, { forceRefetch: true }))
    await Promise.all(dispatch(apiPOTA.util.getRunningQueriesThunk()))
    apiPromise.unsubscribe?.()

    const spots = apiPromise.data || []

    return spots
      .filter(spot => spot.source.toUpperCase() !== 'RBN')
      .map(spot => {
        return {
          call: spot.spotter,
          timeInMillis: spot.timeInMillis,
          mode: spot.mode,
          note: spot.comments,
          spot
        }
      })
  }
}
