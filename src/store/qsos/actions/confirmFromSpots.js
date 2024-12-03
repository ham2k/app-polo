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

  for (const qso of qsos) {
    const call = qso?.their?.call
    if (!call) {
      continue
    }

    for (const [confirmationName, spots] of Object.entries(hookSpots)) {
      let currentSpot
      // At least two characters should be correct
      let currentDistance = Math.max(call.length - 1, 0)
      for (const spot of spots) {
        if (spot.mode !== qso.mode) {
          continue
        }

        if (!sameUTCDay(spot.timeInMillis, qso.startAtMillis)) {
          continue
        }

        const distance = getDistance(call, spot.call)
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
