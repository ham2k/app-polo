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

  confirmQSO: async ({ operation, qso, timestamp, dispatch }) => {
    if (!operation.stationCall) {
      return
    }

    const park = findRef(operation, 'potaActivation')?.ref
    if (!park) {
      return
    }

    const args = { call: operation.stationCall, park, timestamp }
    const apiPromise = await dispatch(apiPOTA.endpoints.spotComments.initiate(args))
    await Promise.all(dispatch(apiPOTA.util.getRunningQueriesThunk()))
    apiPromise.unsubscribe?.()

    const spots = apiPromise.data

    const spot = spots.find(it => it.spotter === qso.their.call)
    if (!spot) {
      return
    }

    if (spot.source.toUpperCase() === 'RBN') {
      return
    }

    if (spot.mode !== qso.mode) {
      return
    }

    if (!sameUTCDay(spot.timeInMillis, qso.startAtMillis)) {
      return
    }

    return {
      received: true,
      comment: spot.comments
    }
  },

  fetchConfirmation: (qso) => {
    const potaSpot = qso?.qsl && qso.qsl[confirmationName]
    if (!potaSpot || !potaSpot.received) {
      return
    }

    return {
      title: 'POTA Spot',
      note: potaSpot.comment
    }
  }
}

function sameUTCDay (aMillis, bMillis) {
  if (!aMillis || !bMillis) {
    return false
  }

  const dateA = new Date(aMillis)
  const dateB = new Date(bMillis)

  return dateA.getUTCDate() === dateB.getUTCDate() &&
    dateA.getUTCMonth() === dateB.getUTCMonth() &&
    dateA.getUTCFullYear() === dateB.getUTCFullYear()
}
