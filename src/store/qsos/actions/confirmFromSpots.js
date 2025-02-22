/*
 * Copyright ©️ 2024 Aldo Mendoza <NA7DO>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { actions, selectQSOs } from '../qsosSlice'
import { findHooks } from '../../../extensions/registry'
import { get as getDistance } from 'fast-levenshtein'

export const confirmFromSpots = (options = {}) => async (dispatch, getState) => {
  if (!options.operation) {
    return
  }

  const hooks = findHooks('confirmation')
  if (!hooks || hooks.length === 0) {
    return
  }

  const qsos = selectQSOs(getState(), options.operation.uuid)
  if (!qsos || qsos.length === 0) {
    return
  }

  const hookSpots = {}
  await Promise.all(hooks.map(hook => hook.fetchSpots({
    operation: options.operation,
    dispatch
  }).then(spots => {
    hookSpots[hook.confirmationName] = spots
  })))

  const stationCall = options.operation.stationCall
  const qsoCalls = new Set(qsos.map(qso => qso?.their?.call))
  for (const qso of qsos) {
    const call = qso?.their?.call
    if (!call) {
      continue
    }

    for (const [confirmationName, spots] of Object.entries(hookSpots)) {
      let currentSpot
      // At most two characters can be wrong
      let currentDistance = 3
      for (const spot of spots) {
        if (stationCall.split('/').some(part => part === spot.call)) {
          continue
        }

        if (spot.mode !== qso.mode) {
          continue
        }

        if (!sameUTCDay(spot.timeInMillis, qso.startAtMillis)) {
          continue
        }

        const distance = spot.call === call
          ? 0 // Use the spot if it matches the QSO call exactly
          : qsoCalls.has(spot.call)
            ? Number.MAX_VALUE // Skip the spot if it matches another QSO in the log
            : getDistance(call, spot.call) // Calculate distance if the spot hasn't been used
        if (distance < currentDistance) {
          currentDistance = distance
          currentSpot = spot
        }
      }

      if (currentSpot) {
        const qsl = qso.qsl || {}
        qsl[confirmationName] = {
          spot: currentSpot.spot,
          isGuess: currentDistance !== 0
        }
        dispatch(actions.addQSO({
          uuid: options.operation.uuid,
          qso: {
            ...qso,
            qsl
          }
        }))
      }
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
